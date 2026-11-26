param([int]$Keep = 14, [string]$To = '')
. "$PSScriptRoot\common.ps1"
$S = Get-Secrets
if (-not $S) { throw 'No data yet - start the system first.' }
if (-not $To) { $To = Join-Path $Root 'backups' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$dest = Join-Path $To "clinic-$stamp"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$env:PGPASSWORD = $S.pg_superuser
& (Join-Path $Pg 'pg_dump.exe') -h 127.0.0.1 -p $PgPort -U postgres -d postgres -Fc -f (Join-Path $dest 'database.dump')
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed (is the system running?)' }
# files keep their metadata in NTFS streams: robocopy copies them, a zip would not
& robocopy.exe (Join-Path $Data 'storage-files') (Join-Path $dest 'storage-files') /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'File backup failed' }
Copy-Item $SecretsFile (Join-Path $dest 'secrets.json')
Get-ChildItem $To -Directory | Where-Object Name -like 'clinic-*' | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Recurse -Force
Write-Host "Backup written to $dest"
Write-Host 'Copy this folder to another disk or PC: it holds patient data and the keys needed to restore it.'
