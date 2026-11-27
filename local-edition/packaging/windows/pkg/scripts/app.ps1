# Dentimate Pro desktop window: starts the local system in the background (no console),
# opens it in its own app window (Edge/Chrome app mode, own profile), and on close asks
# whether to stop the system. Data rules are unchanged (data folder next to the programs).
param([switch]$Test)
. "$PSScriptRoot\common.ps1"
Add-Type -AssemblyName System.Windows.Forms
$Log = Join-Path $Data 'logs\app.log'
New-Item -ItemType Directory -Force (Split-Path $Log) | Out-Null
function L($m) { "$(Get-Date -Format s) $m" | Add-Content -Path $Log -Encoding UTF8 }
function Msg($text, $buttons) {
    return [System.Windows.Forms.MessageBox]::Show($text, 'Dentimate Pro', $buttons, 'Information', 'Button1', 'DefaultDesktopOnly')
}
function Up {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        $r = [Net.WebRequest]::Create("https://localhost:$($Script:HttpsPort)/index.html"); $r.Timeout = 4000
        $resp = $r.GetResponse(); $ok = ([int]$resp.StatusCode -eq 200); $resp.Close(); return $ok
    } catch { return $false }
}
function RunHidden($script, $args2, $secs) {
    $o = Join-Path $env:TEMP "denti-$([guid]::NewGuid().ToString('N')).log"
    $p = Start-Process powershell.exe -ArgumentList (@('-NoProfile','-ExecutionPolicy','Bypass','-File',$script) + $args2) -RedirectStandardOutput $o -RedirectStandardError "$o.err" -PassThru -WindowStyle Hidden
    $null = $p.Handle
    if (-not $p.WaitForExit($secs * 1000)) { try { $p.Kill() } catch {}; return 'timeout' }
    return $p.ExitCode
}
$weStarted = $false
if (-not (Up)) {
    L 'starting services'
    $rc = RunHidden (Join-Path $PSScriptRoot 'start.ps1') @('-NoBrowser') 600
    L "start rc=$rc"
    if (-not (Up)) {
        [void](Msg "تعذر تشغيل النظام. التفاصيل في المجلد data\logs" 'OK')
        exit 1
    }
    $weStarted = $true
}
# first run: no owner yet -> open the owner-creation window once
try {
    $S = Get-Content (Join-Path $Data 'secrets.json') -Raw | ConvertFrom-Json
    $env:PGPASSWORD = $S.pg_superuser
    $n = (& (Join-Path $Pg 'psql.exe') -h 127.0.0.1 -p $PgPort -U postgres -d postgres -tAc 'select count(*) from public.clinic_admins' 2>$null | Out-String).Trim()
    L "owners=$n"
    if ($n -eq '0' -and -not $Test) {
        [void](Msg "أول تشغيل: سيتم فتح نافذة لإنشاء حساب المالك. اكتب البريد وكلمة المرور ثم اضغط Enter." 'OK')
        $c = Start-Process -FilePath (Join-Path $Root 'CREATE-OWNER.bat') -PassThru
        $null = $c.Handle; $c.WaitForExit()
    }
} catch { L "owner check skipped: $_" }
# find Edge or Chrome
$cands = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
           "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
           "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
$exe = $cands | Where-Object { Test-Path $_ } | Select-Object -First 1
$url = "https://localhost:$($Script:HttpsPort)/"
if (-not $exe) {
    L 'no Edge/Chrome found, opening default browser'
    Start-Process $url
    [void](Msg "تم فتح النظام في المتصفح الافتراضي. لإيقاف النظام شغّل STOP-CLINIC.bat." 'OK')
    exit 0
}
$prof = Join-Path $Data 'app-profile'
$ba = @("--app=$url", "--user-data-dir=$prof", '--ignore-certificate-errors', '--no-first-run', '--no-default-browser-check', '--window-size=1366,850')
if ($Test) { $ba += '--remote-debugging-port=9333' }
L "launch $exe"
$b = Start-Process -FilePath $exe -ArgumentList $ba -PassThru
$null = $b.Handle
if ($Test) {
    Start-Sleep -Seconds 30
    try { $j = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9333/json' -TimeoutSec 5).Content; L "TEST page-list-bytes=$($j.Length) has-url=$([int]($j -match 'localhost:8443'))"; Set-Content (Join-Path $Data 'logs\app-test-json.txt') $j } catch { L "TEST debug-port-failed $_" }
    try { Stop-Process -Id $b.Id -Force -ErrorAction SilentlyContinue } catch {}
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} else {
    $b.WaitForExit()
    # some browsers hand over to a child process: wait while any process still uses our profile
    while (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*$prof*" }) { Start-Sleep -Seconds 2 }
}
L 'window closed'
if ($Test) { $stop = $true } else {
    $ans = Msg "تم إغلاق النافذة.`nهل تريد إيقاف النظام؟`n`nنعم = إيقاف (بقية الأجهزة على الشبكة ستفقد الاتصال)`nلا = يبقى شغالاً في الخلفية" 'YesNo'
    $stop = ($ans -eq 'Yes')
}
if ($stop) { L 'stopping'; [void](RunHidden (Join-Path $PSScriptRoot 'stop.ps1') @() 180); L 'stopped' }
