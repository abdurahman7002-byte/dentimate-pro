param([Parameter(Mandatory = $true)][string]$From)
. "$PSScriptRoot\common.ps1"
. "$PSScriptRoot\stop.ps1"
if (-not (Test-Path (Join-Path $From 'database.dump'))) { throw "No database.dump in $From" }
if (-not (Test-Path (Join-Path $From 'secrets.json'))) { throw "No secrets.json in $From" }
Say "Restoring from $From ..."
Stop-All
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (Test-Path (Join-Path $Data 'pgdata')) {
    # the current data is kept, never deleted
    $old = Join-Path $Root "data-before-restore-$stamp"
    New-Item -ItemType Directory -Force -Path $old | Out-Null
    foreach ($n in 'pgdata', 'storage-files', 'secrets.json', 'initialized.flag') {
        $p = Join-Path $Data $n
        if (Test-Path $p) { Move-Item $p (Join-Path $old $n) }
    }
    Say "Current data moved to $old"
}
Copy-Item (Join-Path $From 'secrets.json') $SecretsFile -Force
$S = Get-Secrets
$PgData = Join-Path $Data 'pgdata'
$pw = Join-Path $Data 'pw.tmp'
Set-Content -Path $pw -Value $S.pg_superuser -Encoding ASCII -NoNewline
$rc = Run-Quiet (Join-Path $Pg 'initdb.exe') @('-D', $PgData, '-U', 'postgres', '-E', 'UTF8', '--auth=scram-sha-256', "--pwfile=$pw") 'initdb' 240
Remove-Item $pw -Force
if ($rc -ne 0) { throw 'initdb failed' }
$rc = Run-Quiet (Join-Path $Pg 'pg_ctl.exe') @('-D', $PgData, '-o', "-p $PgPort -c listen_addresses=127.0.0.1", '-l', (Join-Path $Logs 'postgres.log'), '-w', 'start') 'pgctl-start' 120
if ($rc -ne 0) { throw 'Postgres did not start' }
Invoke-Psql -sql 'create extension if not exists "uuid-ossp"; create extension if not exists pgcrypto;'
Invoke-Psql -file (Join-Path $Root 'app\sql\bootstrap-roles.sql') -vars @{ pgpass = $S.svc_db }
$env:PGPASSWORD = $S.pg_superuser
$rc = Run-Quiet (Join-Path $Pg 'pg_restore.exe') @('-h', '127.0.0.1', '-p', "$PgPort", '-U', 'postgres', '-d', 'postgres', '--clean', '--if-exists', (Join-Path $From 'database.dump')) 'pgrestore' 600
Say "Database restored (pg_restore exit code $rc; warnings about existing objects are normal)."
$src = Join-Path $From 'storage-files'
if (Test-Path $src) {
    & robocopy.exe $src (Join-Path $Data 'storage-files') /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) { throw 'Restoring files failed' }
}
Set-Content -Path (Join-Path $Data 'initialized.flag') -Value (Get-Date -Format s)
[void](Run-Quiet (Join-Path $Pg 'pg_ctl.exe') @('-D', $PgData, '-m', 'fast', '-w', 'stop') 'pgctl-stop' 120)
Say 'Done. Now run START-CLINIC.bat.'
