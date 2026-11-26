#!/bin/sh
# Dentix browser trial bootstrap - runs INSIDE a GitHub Codespace.
# Cloud-only synthetic demo: fixtures only, no real patient data. This is NOT
# the offline/LAN deployment and proves nothing about clinic hardware.
set -e

if [ -z "$CODESPACE_NAME" ]; then
    echo "CODESPACE_NAME is not set - run this inside a GitHub Codespace." >&2
    exit 1
fi

cd "$(dirname "$0")/../official"

# Rerun guard: the database persists in ./volumes/db/data (bind mount). If an
# initialized DB exists but .env.dentix is gone, regenerating fresh secrets
# would silently orphan the existing installation (every stored credential
# and session becomes invalid). Refuse loudly instead.
if [ ! -f .env.dentix ] && [ -d volumes/db/data ] && [ -n "$(ls -A volumes/db/data 2>/dev/null)" ]; then
    echo "REFUSING to generate fresh secrets: an initialized database already" >&2
    echo "exists at volumes/db/data but .env.dentix is missing. Recreate" >&2
    echo ".env.dentix from the original values, or delete volumes/db/data for a" >&2
    echo "fully fresh trial." >&2
    exit 1
fi

if [ ! -f .env.dentix ]; then
    cp .env.example .env.dentix
    JWT_SECRET=$(openssl rand -hex 32)
    ANON_KEY=$(node ../../ci/mint-jwt.mjs "$JWT_SECRET" anon)
    SERVICE_ROLE_KEY=$(node ../../ci/mint-jwt.mjs "$JWT_SECRET" service_role)
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.dentix
    sed -i "s|^ANON_KEY=.*|ANON_KEY=$ANON_KEY|" .env.dentix
    sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" .env.dentix
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" .env.dentix
    sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$(openssl rand -hex 16)|" .env.dentix
    sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$(openssl rand -hex 32)|" .env.dentix
    sed -i "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=$(openssl rand -hex 16)|" .env.dentix
    sed -i "s|^LOGFLARE_API_KEY=.*|LOGFLARE_API_KEY=$(openssl rand -hex 16)|" .env.dentix
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_ID=.*|S3_PROTOCOL_ACCESS_KEY_ID=$(openssl rand -hex 16)|" .env.dentix
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_SECRET=.*|S3_PROTOCOL_ACCESS_KEY_SECRET=$(openssl rand -hex 32)|" .env.dentix
    sed -i "s|^DISABLE_SIGNUP=.*|DISABLE_SIGNUP=true|" .env.dentix
    echo "fresh .env.dentix generated (secrets are this codespace's only)"
else
    ANON_KEY=$(grep -m1 '^ANON_KEY=' .env.dentix | cut -d= -f2-)
fi

ORIGIN="https://${CODESPACE_NAME}-8080.app.github.dev"
# the provision server's origin allowlist includes this public form of the
# trial origin alongside the internal listener form (see trial compose)
export TRIAL_PUBLIC_ORIGIN="$ORIGIN"
printf 'window.DENTIX_CONFIG = { SUPABASE_URL: "%s", SUPABASE_ANON_KEY: "%s" };\n' "$ORIGIN" "$ANON_KEY" > ../../js/config.local.js
(cd ../.. && sh packaging/build-web.sh)

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.pg17.yml -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml -f ../trial/docker-compose.trial.yml --env-file .env.dentix"
$COMPOSE config --quiet
$COMPOSE up -d --wait
$COMPOSE exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-storage.sql
$COMPOSE exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-realtime.sql

echo
if [ "$($COMPOSE exec -T db psql -U postgres -tA -d postgres -c "select count(*) from auth.users" 2>/dev/null || echo 0)" != "0" ]; then
    echo "An owner account already exists in this trial DB - skipping bootstrap."
    echo "Log in with the original owner credentials."
else
    echo "Create the owner account for this trial (email + password you choose):"
    printf "owner email: "; read -r OWNER_EMAIL
    stty -echo 2>/dev/null || true; printf "password: "; read -r P1; printf "\npassword again: "; read -r P2; printf "\n"; stty echo 2>/dev/null || true
    printf '%s\n%s\n%s\n' "$OWNER_EMAIL" "$P1" "$P2" | $COMPOSE exec -T provision node bootstrap-owner.mjs
    P1=""; P2=""
fi

echo
echo "Trial is up. Open:  $ORIGIN"
echo "Keep the forwarded port PRIVATE (Ports tab -> visibility = private)."
echo "When done: stop the codespace (compute stops), and DELETE it to free the"
echo "storage quota (stopped codespaces still count against included storage)."
