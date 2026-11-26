# Docker validation (DRAFT - for the pending validation session, NOT clinic execution)

(requires any Docker machine - NOT yet executed anywhere)

Prerequisite: Docker Engine + Compose v2.27+ (for !override tags), ~4 GB free RAM.

  cd packaging/official
  cp .env.example .env.dentix   # then set: DISABLE_SIGNUP=true, regenerate
                                # DASHBOARD_PASSWORD + all secrets, set LAN_HOST
  ../build-web.sh               # builds packaging/web (allowlist export incl.
                                # images/, webfonts/, manifest, icons, sw; ships real
                                # js/config.local.js if present, else placeholder+warning -
                                # placeholder is fine for boot smoke, app login needs real)
  # generate LAN TLS cert+key into packaging/certs (see install-runbook.md)
  docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
      -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
      --env-file .env.dentix config --quiet     # merged-config validation
  docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
      -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
      --env-file .env.dentix up -d --wait
  # initdb ran the zz_ scripts (schema/roles/RLS/queue table). The storage schema
  # is created by the storage service AFTER initdb, so buckets + object policies
  # are a separate one-time step (packaging/post-boot-storage.sql):
  docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
      -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
      --env-file .env.dentix exec -T db \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-storage.sql
  # realtime publication membership for the app's notification tables
  # (js/notification.js); without it those channels never receive events:
  docker compose -f docker-compose.yml -f docker-compose.pg17.yml \
      -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml \
      --env-file .env.dentix exec -T db \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-realtime.sql
  # then run the smoke checklist in install-runbook.md

Init-order note: zz10-zz40 must not reference the storage schema; post-boot-storage.sql
is idempotent and re-runnable.

Pooler note: the supavisor connection pooler is DISABLED by default in the dentix
override (opt-in compose profile "pooler"). The app and provision server connect via
Kong/PostgREST only; no app component uses pooler ports 5432/6543. Do not publish or
document those ports for the clinic install.

Backup note (constraint for the install-runbook backup section): in this
supabase/postgres image the 'postgres' role is supautils-restricted, not a real
superuser. Backup/restore commands documented for the clinic MUST run as
supabase_admin (its password follows POSTGRES_PASSWORD at initdb): pg_dump as
postgres can silently skip schemas it cannot read (auth, storage), and role ALTERs
as postgres are rejected.

Status: NOT YET RUN. This is the narrow environment need for the remaining gates
(merged config, boot, realtime, TLS-terminated stack, compose-level backup,
exact-image PG17 retest).
