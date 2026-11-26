param([switch]$NoBrowser)
. "$PSScriptRoot\common.ps1"
. "$PSScriptRoot\stop.ps1"
$App = Join-Path $Root 'app'
$Web = Join-Path $App 'web'
$Sql = Join-Path $App 'sql'
$PgData = Join-Path $Data 'pgdata'
$StoreDir = Join-Path $Data 'storage-files'
$Flag = Join-Path $Data 'initialized.flag'
$fwd = { param($p) $p -replace '\\','/' }

Say 'Starting the clinic system...'
Stop-All

# ---------- first run: secrets and database ----------
$first = -not (Test-Path $Flag)
if (-not (Get-Secrets)) {
    $jwt = New-Hex 32
    $sec = [ordered]@{
        jwt_secret = $jwt
        pg_superuser = New-Hex 16
        svc_db = New-Hex 16
        anon_key = (& $Node (Join-Path $PSScriptRoot 'mint.mjs') $jwt anon)
        service_key = (& $Node (Join-Path $PSScriptRoot 'mint.mjs') $jwt service_role)
        s3_key = New-Hex 8
        s3_secret = New-Hex 16
    }
    $sec | ConvertTo-Json | Set-Content -Path $SecretsFile -Encoding ASCII
}
$S = Get-Secrets
if (-not (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
    Say 'First run: creating the database...'
    $pw = Join-Path $Data 'pw.tmp'
    Set-Content -Path $pw -Value $S.pg_superuser -Encoding ASCII -NoNewline
    $rc = Run-Quiet (Join-Path $Pg 'initdb.exe') @('-D', $PgData, '-U', 'postgres', '-E', 'UTF8', '--auth=scram-sha-256', "--pwfile=$pw") 'initdb' 240
    Remove-Item $pw -Force
    if ($rc -ne 0) { throw 'initdb failed (see data\logs\initdb.err.log)' }
}
$rc = Run-Quiet (Join-Path $Pg 'pg_ctl.exe') @('-D', $PgData, '-o', "-p $PgPort -c listen_addresses=127.0.0.1", '-l', (Join-Path $Logs 'postgres.log'), '-w', 'start') 'pgctl-start' 120
if ($rc -ne 0) { throw 'Postgres did not start (see data\logs\postgres.log)' }

$authEnv = @{
    GOTRUE_DB_DRIVER = 'postgres'
    DATABASE_URL = "postgres://supabase_auth_admin:$($S.svc_db)@127.0.0.1:$PgPort/postgres?sslmode=disable"
    GOTRUE_DB_DATABASE_URL = "postgres://supabase_auth_admin:$($S.svc_db)@127.0.0.1:$PgPort/postgres?sslmode=disable"
    GOTRUE_DB_MIGRATIONS_PATH = (& $fwd (Join-Path $Rt 'auth\migrations'))
    GOTRUE_API_HOST = '127.0.0.1'; GOTRUE_API_PORT = '9999'
    API_EXTERNAL_URL = "https://localhost:$HttpsPort"; GOTRUE_SITE_URL = "https://localhost:$HttpsPort"
    GOTRUE_JWT_SECRET = $S.jwt_secret; GOTRUE_JWT_EXP = '3600'; GOTRUE_JWT_AUD = 'authenticated'
    GOTRUE_JWT_DEFAULT_GROUP_NAME = 'authenticated'; GOTRUE_JWT_ADMIN_ROLES = 'service_role'
    GOTRUE_EXTERNAL_EMAIL_ENABLED = 'true'; GOTRUE_MAILER_AUTOCONFIRM = 'true'; GOTRUE_DISABLE_SIGNUP = 'true'
}
if ($first) {
    Say 'First run: preparing roles and extensions...'
    Invoke-Psql -sql 'create extension if not exists "uuid-ossp"; create extension if not exists pgcrypto;'
    Invoke-Psql -file (Join-Path $Sql 'bootstrap-roles.sql') -vars @{ pgpass = $S.svc_db }
    Say 'First run: preparing the login service...'
    foreach ($k in $authEnv.Keys) { Set-Item -Path "Env:$k" -Value $authEnv[$k] }
    & (Join-Path $Rt 'auth\auth.exe') migrate *> (Join-Path $Logs 'auth-migrate.log')
    $rc = $LASTEXITCODE
    foreach ($k in $authEnv.Keys) { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
    if ($rc -ne 0) { throw 'Login service migration failed (see data\logs\auth-migrate.log)' }
}
Start-Svc 'auth' (Join-Path $Rt 'auth\auth.exe') @('serve') $authEnv (Join-Path $Rt 'auth') | Out-Null
if ((Wait-Http 'http://127.0.0.1:9999/health' 60) -ne '200') { throw 'Login service did not start (see data\logs\auth.err.log)' }
if ($first) {
    Say 'First run: creating the clinic tables...'
    foreach ($f in 'zz10-schema','zz20-employees','zz30-rls') { Invoke-Psql -file (Join-Path $Sql "$f.sql") }
    Invoke-Psql -file (Join-Path $Sql 'win-grants.sql')
}

# PostgREST
$pgrstConf = Join-Path $Data 'postgrest.conf'
@"
db-uri = "postgres://authenticator:$($S.svc_db)@127.0.0.1:$PgPort/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$($S.jwt_secret)"
server-host = "127.0.0.1"
server-port = 3000
"@ | Set-Content -Path $pgrstConf -Encoding ASCII
Start-Svc 'postgrest' (Join-Path $Rt 'postgrest\postgrest.exe') @($pgrstConf) @{} (Join-Path $Rt 'postgrest') | Out-Null
if ((Wait-Http 'http://127.0.0.1:3000/' 40) -ne '200') { throw 'Data service did not start (see data\logs\postgrest.err.log)' }

# Storage (files)
New-Item -ItemType Directory -Force -Path $StoreDir | Out-Null
$stEnv = @{
    DATABASE_URL = "postgres://supabase_storage_admin:$($S.svc_db)@127.0.0.1:$PgPort/postgres"; DATABASE_POOL_URL = ''
    ANON_KEY = $S.anon_key; SERVICE_KEY = $S.service_key; AUTH_JWT_SECRET = $S.jwt_secret; PGRST_JWT_SECRET = $S.jwt_secret
    POSTGREST_URL = 'http://127.0.0.1:3000'
    SERVER_PORT = '5000'; SERVER_HOST = '127.0.0.1'; PORT = '5000'
    STORAGE_BACKEND = 'file'; FILE_STORAGE_BACKEND_PATH = (& $fwd $StoreDir); GLOBAL_S3_BUCKET = 'stub'
    TENANT_ID = 'clinic'; REGION = 'local'; FILE_SIZE_LIMIT = '52428800'; UPLOAD_FILE_SIZE_LIMIT = '52428800'; UPLOAD_FILE_SIZE_LIMIT_STANDARD = '52428800'
    ENABLE_IMAGE_TRANSFORMATION = 'false'; DB_INSTALL_ROLES = 'false'; IS_MULTITENANT = 'false'
    REQUEST_ALLOW_X_FORWARDED_PATH = 'true'; STORAGE_PUBLIC_URL = "https://localhost:$HttpsPort"
    S3_PROTOCOL_ACCESS_KEY_ID = $S.s3_key; S3_PROTOCOL_ACCESS_KEY_SECRET = $S.s3_secret
}
$stProc = Start-Svc 'storage' $Node @('dist/start/server.js') $stEnv (Join-Path $Rt 'storage')
if ((Wait-Http 'http://127.0.0.1:5000/status' 90) -ne '200') { throw "File service did not start (exited=$($stProc.HasExited); see data\logs\storage.err.log)" }
if ($first) {
    Say 'First run: creating file folders and rules...'
    Invoke-Psql -file (Join-Path $Sql 'zz40-storage.sql')
    Invoke-Psql -file (Join-Path $Sql 'post-boot-storage.sql')
    Invoke-Psql -file (Join-Path $Sql 'win-storage-grants.sql')
    Set-Content -Path $Flag -Value (Get-Date -Format s)
}

# ---------- addresses this PC answers on ----------
$names = New-Object System.Collections.Generic.List[string]
$names.Add('localhost'); $names.Add('127.0.0.1')
try {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { $names.Add($_.IPAddress) }
} catch {}
$names.Add($env:COMPUTERNAME)
$origins = ($names | ForEach-Object { "https://${_}:$HttpsPort" })

# web config: the browser talks to the same address it loaded the page from
@"
window.DENTIX_CONFIG = { SUPABASE_URL: window.location.origin, SUPABASE_ANON_KEY: '$($S.anon_key)', REALTIME: false };
"@ | Set-Content -Path (Join-Path $Web 'js\config.local.js') -Encoding ASCII

# provision server (owner-only account management), loopback only
$prEnv = @{
    GOTRUE_URL = 'http://127.0.0.1:9999'; POSTGREST_URL = 'http://127.0.0.1:3000'; SERVICE_ROLE_JWT = $S.service_key
    ALLOWED_ORIGINS = ($origins -join ','); PROVISION_PORT = '9090'; PROVISION_BIND = '127.0.0.1'; BOOTSTRAP_PORT = '9091'
}
Start-Svc 'provision' $Node @((Join-Path $App 'server\provision-server.mjs')) $prEnv $App | Out-Null
if ((Wait-Http 'http://127.0.0.1:9090/nope' 20) -ne '404') { throw 'Account service did not start (see data\logs\provision.err.log)' }

# web server + HTTPS
$sites = ($origins -join ', ')
$caddyFile = Join-Path $Data 'Caddyfile'
@"
{
    admin off
    skip_install_trust
    auto_https disable_redirects
    storage file_system {
        root "$(& $fwd (Join-Path $Data 'caddy'))"
    }
}
$sites {
    tls internal
    encode gzip
    handle /auth/v1/admin* {
        respond 404
    }
    handle_path /rest/v1/* {
        reverse_proxy 127.0.0.1:3000
    }
    handle_path /auth/v1/* {
        reverse_proxy 127.0.0.1:9999
    }
    handle_path /storage/v1/* {
        reverse_proxy 127.0.0.1:5000
    }
    @prov path /provision /reset-password /account
    handle @prov {
        reverse_proxy 127.0.0.1:9090
    }
    handle {
        root * $(& $fwd $Web)
        file_server
    }
}
"@ | Set-Content -Path $caddyFile -Encoding ASCII
Start-Svc 'caddy' (Join-Path $Rt 'caddy\caddy.exe') @('run','--config',$caddyFile,'--adapter','caddyfile') @{} $Data | Out-Null
if ((Wait-Http "https://localhost:$HttpsPort/index.html" 40) -ne '200') { throw 'Web server did not start (see data\logs\caddy.err.log)' }

$env:PGPASSWORD = $S.pg_superuser
$admins = & (Join-Path $Pg 'psql.exe') -h 127.0.0.1 -p $PgPort -U postgres -d postgres -tAc 'select count(*) from public.clinic_admins'
Say ''
Say 'The clinic system is running. Open one of these in a browser:'
$origins | ForEach-Object { Say "  $_" }
if ("$admins".Trim() -eq '0') { Say 'No owner account yet: run CREATE-OWNER.bat once.' }
if (-not $NoBrowser) { Start-Process "https://localhost:$HttpsPort/" }
