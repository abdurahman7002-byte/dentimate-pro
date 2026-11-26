# Dentix local edition - install, backup, restore runbook

Everything in this file is the exact procedure the CI pipeline
(`docker-validation.yml`, branch `ci-validation`) executes and gates on every
run. Where a step cannot be fully validated in CI (a real LAN, real Windows
clients), that limit is stated explicitly.

Validated environment: Linux x86_64, Docker Engine + Compose v2.27+, ~4 GB
free RAM. All commands below run from `local-edition/packaging/official`
unless noted otherwise.

NOT yet validated: Windows / Docker Desktop as the server host. The clinic
trial on a Windows PC is still open; if attempted, use the WSL2 backend and
treat the first boot as a validation run, not a production move.

---

## 1. Install

```bash
git clone <this repo> && cd <repo>/local-edition/packaging/official
cp .env.example .env.dentix
```

Regenerate every secret in `.env.dentix` (never ship the example values):

```bash
openssl rand -hex 32   # JWT_SECRET, SECRET_KEY_BASE
openssl rand -hex 16   # POSTGRES_PASSWORD, DASHBOARD_PASSWORD, PG_META_CRYPTO_KEY,
                       # LOGFLARE_API_KEY, S3_PROTOCOL_ACCESS_KEY_ID
openssl rand -hex 32   # S3_PROTOCOL_ACCESS_KEY_SECRET
```

`ANON_KEY` and `SERVICE_ROLE_KEY` are JWTs derived from your `JWT_SECRET`:

```bash
node ../../ci/mint-jwt.mjs "<JWT_SECRET>" anon          # -> ANON_KEY
node ../../ci/mint-jwt.mjs "<JWT_SECRET>" service_role  # -> SERVICE_ROLE_KEY
```

Also set in `.env.dentix`:

- `DISABLE_SIGNUP=true` (accounts are provisioned by the owner only)
- `LAN_HOST=<this machine's LAN address or name>`

App config and web build (from `local-edition/`):

```bash
printf 'window.DENTIX_CONFIG = { SUPABASE_URL: "https://<LAN_HOST>", SUPABASE_ANON_KEY: "<ANON_KEY>" };\n' > js/config.local.js
sh packaging/build-web.sh
```

TLS: nginx serves HTTPS only. Create a small LAN CA and a server certificate
whose SAN covers the LAN address, then install the CA on each clinic device
once:

```bash
mkdir -p packaging/certs
openssl genrsa -out packaging/certs/lan-ca.key 2048
openssl req -x509 -new -nodes -key packaging/certs/lan-ca.key -days 825 \
  -subj "/CN=Dentix LAN CA" -out packaging/certs/lan-ca.crt
openssl req -newkey rsa:2048 -nodes -keyout packaging/certs/dentix.key \
  -subj "/CN=<LAN_HOST>" -out /tmp/lan.csr
printf 'subjectAltName=DNS:<LAN_HOST>,IP:<LAN_IP>\nextendedKeyUsage=serverAuth\n' > /tmp/san.ext
openssl x509 -req -in /tmp/lan.csr -CA packaging/certs/lan-ca.crt \
  -CAkey packaging/certs/lan-ca.key -CAcreateserial -days 825 \
  -extfile /tmp/san.ext -out packaging/certs/dentix.crt
```

Boot (the compose command below is abbreviated as `$COMPOSE` everywhere):

```bash
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.pg17.yml -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml --env-file .env.dentix"
$COMPOSE config --quiet   # merged-config validation
$COMPOSE up -d --wait
```

Two one-time post-boot steps (both idempotent; order matters - the storage
schema exists only after the storage service's first boot):

```bash
$COMPOSE exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-storage.sql
$COMPOSE exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-realtime.sql
```

`post-boot-realtime.sql` adds the four tables the app subscribes to
(`notifications`, `patient_visits`, `lab_works`, `inventory_items`) to the
`supabase_realtime` publication. Skipping it means notifications never arrive
live. CI gates that all four are members.

Create the first owner account (prompts for email + password on stdin):

```bash
printf '<owner-email>\n<password>\n<password>\n' | $COMPOSE exec -T provision node bootstrap-owner.mjs
```

Open `https://<LAN_HOST>` from a clinic device, log in as the owner, create a
patient, upload a file, and confirm a notification appears.

## 2. Backup (the CI-tested path)

Quiesce the clinic (no one working) so the dump and the file copy are
consistent. Run all database commands as `supabase_admin`, not `postgres`: in
the `supabase/postgres` image the `postgres` role is restricted and `pg_dump`
as `postgres` can silently skip schemas it cannot read (`auth`, `storage`).

```bash
PGP="$(grep '^POSTGRES_PASSWORD=' .env.dentix | head -1 | cut -d= -f2-)"

# 1. database dump (custom format)
$COMPOSE exec -T -e PGPASSWORD="$PGP" db \
  pg_dump -h localhost -U supabase_admin -d postgres -Fc > backup-$(date +%F).dump

# 2. roles dump (cluster-level roles are NOT in pg_dump output).
#    SECRET: contains password hashes. chmod 600, store encrypted, never commit.
$COMPOSE exec -T -e PGPASSWORD="$PGP" db \
  pg_dumpall -h localhost -U supabase_admin --roles-only > backup-$(date +%F)-roles.sql
chmod 600 backup-$(date +%F)-roles.sql

# 3. patient files (storage volume)
cp -r volumes/storage backup-$(date +%F)-storage

# 4. manifest for later verification
sha256sum backup-$(date +%F).dump > backup-$(date +%F).manifest
(cd backup-$(date +%F)-storage && find . -type f -exec sha256sum {} +) >> backup-$(date +%F).manifest
```

Keep `.env.dentix` with the backup set (it is needed to re-mint nothing - the
JWT secrets must match the dumped data). It is also secret; same handling as
the roles dump.

## 3. Restore (the CI-tested path)

CI restores into an isolated scratch stack so the running system is never
touched; do the same when verifying a backup. The core sequence:

```bash
docker network create dentix-restore-net
docker run -d --name dentix-restore-db --network dentix-restore-net \
  -e POSTGRES_PASSWORD=tmp-only supabase/postgres:17.6.1.136
# wait for pg_isready, then:
docker exec -e PGPASSWORD=tmp-only dentix-restore-db \
  psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  -c "create database restore_verify;"

# roles: "role ... already exists" errors for the image's built-in roles are
# EXPECTED; everything else must apply
docker exec -e PGPASSWORD=tmp-only -i dentix-restore-db \
  psql -h localhost -U supabase_admin -d postgres -o /dev/null \
  < backup-YYYY-MM-DD-roles.sql

# the dump rewrote supabase_admin's hash to the source cluster's; reset the
# passwords this restore environment uses (local socket trusts, no -h):
docker exec dentix-restore-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c \
  "alter role supabase_admin with password 'tmp-only';
   alter role authenticator with password 'tmp-only';
   alter role supabase_storage_admin with password 'tmp-only';"

docker exec -e PGPASSWORD=tmp-only -i dentix-restore-db \
  pg_restore -h localhost -U supabase_admin -d restore_verify --exit-on-error \
  < backup-YYYY-MM-DD.dump
```

Then start PostgREST and the storage service against it. The storage service
MUST get `FILE_STORAGE_BACKEND_PATH` - without it the file backend throws at
startup and the service never listens (this exact failure cost a CI cycle):

```bash
docker run -d --name dentix-restore-rest --network dentix-restore-net \
  -e PGRST_DB_URI=postgres://authenticator:tmp-only@dentix-restore-db:5432/restore_verify \
  -e PGRST_DB_SCHEMAS=public,storage -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="<JWT_SECRET>" postgrest/postgrest:v14.18

docker run -d --name dentix-restore-storage --network dentix-restore-net \
  -p 127.0.0.1:5099:5000 \
  -e ANON_KEY="<ANON_KEY>" -e SERVICE_KEY="<SERVICE_ROLE_KEY>" \
  -e AUTH_JWT_SECRET="<JWT_SECRET>" \
  -e POSTGREST_URL=http://dentix-restore-rest:3000 \
  -e DATABASE_URL=postgres://supabase_storage_admin:tmp-only@dentix-restore-db:5432/restore_verify \
  -e FILE_SIZE_LIMIT=52428800 -e STORAGE_BACKEND=file \
  -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
  -e GLOBAL_S3_BUCKET=stub -e TENANT_ID=stub -e REGION=stub \
  -e REQUEST_ALLOW_X_FORWARDED_PATH=true \
  -v "$PWD/backup-YYYY-MM-DD-storage:/var/lib/storage" \
  supabase/storage-api:v1.98.6

curl -sf http://127.0.0.1:5099/status   # must answer
```

Verification CI performs (do the same before trusting a backup):

- restored row counts equal the backup-time counts (`public.patients`,
  `storage.objects`);
- an authenticated download of a restored object through the restored storage
  service matches the manifest sha256.

Cleanup of the drill environment:

```bash
docker rm -f dentix-restore-storage dentix-restore-rest dentix-restore-db
docker network rm dentix-restore-net
```

## 4. Operational notes

- Realtime: after a page subscribes there is an activation lag of a few
  seconds before postgres_changes events flow (observed in CI: first insert
  right after SUBSCRIBED can be missed). The app refetches missed
  notifications on every (re-)subscribe (`catchUpNotifications` in
  `js/notification.js`), including automatic reconnects; changes committed
  while the connection was down are recovered by that fetch, not replayed by
  realtime.
- The supavisor pooler is disabled by default (opt-in compose profile
  `pooler`); the app reaches the database through Kong/PostgREST and does not
  use the pooler.
- Take a backup before every upgrade and after every schema change.
- Secret handling: the roles dump, `.env.dentix`, and any generated key file
  are secrets - mode 600, encrypted storage, never in git, never in tickets
  or chat.

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| storage-api exits right after boot in a restored/custom stack | `FILE_STORAGE_BACKEND_PATH` unset | set it to `/var/lib/storage` (see 3) |
| notifications never arrive | publication membership missing | run `post-boot-realtime.sql` (see 1) |
| notification arrives a few seconds late right after page load | realtime activation lag | expected; the app catch-up covers the gap |
| roles restore prints "already exists" errors | image built-in roles | expected; only other errors matter |
| `pg_dump` output missing auth/storage rows | dumped as `postgres` | redo as `supabase_admin` (see 2) |
