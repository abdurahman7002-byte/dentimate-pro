# Shared paths and helpers. Dot-sourced by start/stop/backup scripts.
$ErrorActionPreference = 'Continue'
$Script:Root   = Split-Path -Parent $PSScriptRoot
$Script:Rt     = Join-Path $Root 'runtime'
$Script:Data   = Join-Path $Root 'data'
$Script:Logs   = Join-Path $Data 'logs'
$Script:Pg     = Join-Path $Rt 'pgsql\bin'
$Script:Node   = Join-Path $Rt 'node\node.exe'
$Script:PgPort = 54329
$Script:HttpsPort = 8443
$Script:SecretsFile = Join-Path $Data 'secrets.json'
New-Item -ItemType Directory -Force -Path $Data, $Logs | Out-Null

function New-Hex([int]$bytes) {
    $b = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    -join ($b | ForEach-Object { '{0:x2}' -f $_ })
}
function Get-Secrets {
    if (Test-Path $SecretsFile) { return Get-Content $SecretsFile -Raw | ConvertFrom-Json }
    return $null
}
function Say([string]$m) { Write-Host $m; Add-Content -Path (Join-Path $Logs 'start.log') -Value ("{0} {1}" -f (Get-Date -Format s), $m) }
function Wait-Http([string]$url, [int]$seconds = 60, [switch]$Insecure) {
    $until = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $until) {
        try {
            $r = & curl.exe -s -k -o NUL -w '%{http_code}' --ssl-no-revoke $url
            if ($r -match '^[1-4]\d\d$' -and $r -ne '000') { return $r }
        } catch {}
        Start-Sleep -Milliseconds 700
    }
    return '000'
}
function Invoke-Psql([string]$sql, [string]$file, [hashtable]$vars) {
    $s = Get-Secrets
    $env:PGPASSWORD = $s.pg_superuser
    $a = @('-h','127.0.0.1','-p',"$PgPort",'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-q')
    if ($vars) { foreach ($k in $vars.Keys) { $a += @('-v', "$k=$($vars[$k])") } }
    if ($file) { $a += @('-f', $file) } else { $a += @('-c', $sql) }
    & (Join-Path $Pg 'psql.exe') @a
    if ($LASTEXITCODE -ne 0) { throw "psql failed ($file$sql)" }
}
function Start-Svc([string]$name, [string]$exe, [string[]]$argv, [hashtable]$envv, [string]$cwd) {
    foreach ($k in $envv.Keys) { Set-Item -Path "Env:$k" -Value ([string]$envv[$k]) }
    try {
        $q = @($argv | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } })
        $sp = @{ FilePath = $exe; WorkingDirectory = $cwd; WindowStyle = 'Hidden'; PassThru = $true;
                 RedirectStandardOutput = (Join-Path $Logs "$name.out.log"); RedirectStandardError = (Join-Path $Logs "$name.err.log") }
        if ($q.Count -gt 0) { $sp.ArgumentList = $q }
        $p = Start-Process @sp
    } finally {
        foreach ($k in $envv.Keys) { Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue }
    }
    Add-Content -Path (Join-Path $Data 'pids.txt') -Value ("{0} {1}" -f $name, $p.Id)
    return $p
}

# Run a program with output sent to a file (never a pipe), so services it spawns cannot keep us waiting.
function Run-Quiet([string]$exe, [string[]]$argv, [string]$logName, [int]$seconds = 180) {
    $q = @($argv | ForEach-Object { if ($_ -match '\s' -and $_ -notmatch '^"') { '"' + $_ + '"' } else { $_ } })
    $p = Start-Process -FilePath $exe -ArgumentList $q -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $Logs "$logName.out.log") -RedirectStandardError (Join-Path $Logs "$logName.err.log")
    $null = $p.Handle
    if (-not $p.WaitForExit($seconds * 1000)) { try { $p.Kill() } catch {}; return -999 }
    return $p.ExitCode
}
