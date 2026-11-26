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
    $tmp = $null
    if ($file) { $a += @('-f', $file) } else { $tmp = Join-Path $Data 'tmp.sql'; Set-Content -Path $tmp -Value $sql -Encoding ASCII; $a += @('-f', $tmp) }
    & (Join-Path $Pg 'psql.exe') @a
    $rc = $LASTEXITCODE
    if ($tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
    if ($rc -ne 0) { throw "psql failed ($file$sql)" }
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

function Tail-Log([string]$name) {
    $o = ''
    foreach ($ext in 'err','out') {
        $f = Join-Path $Logs "$name.$ext.log"
        if ((Test-Path $f) -and ((Get-Item $f).Length -gt 0)) { $o += "`n--- $name.$ext.log (last lines) ---`n" + ((Get-Content $f -Tail 12 -ErrorAction SilentlyContinue) -join "`n") }
    }
    return $o
}
function Require-Http([string]$label, [string]$logName, $proc, [string]$url, [int]$secs, [string]$expect = '200') {
    $r = Wait-Http $url $secs
    if ($r -ne $expect) {
        $state = if ($proc -and $proc.HasExited) { "the program exited (code $($proc.ExitCode))" } elseif ($proc) { 'the program is running but did not answer' } else { 'no answer' }
        throw "$label did not start: $state (answer: $r).`nPort check and logs:$(Tail-Log $logName)`nFolder: $Root"
    }
}
function Test-PortsFree([int[]]$ports) {
    $busy = @()
    foreach ($p in $ports) {
        $l = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
        if ($l) { $busy += $p }
    }
    if ($busy.Count) { throw "These ports are already used by another program on this PC: $($busy -join ', '). Close that program or tell the developer." }
}
