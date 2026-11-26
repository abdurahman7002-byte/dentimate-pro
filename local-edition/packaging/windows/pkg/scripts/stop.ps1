. "$PSScriptRoot\common.ps1"
function Stop-All {
    $pf = Join-Path $Data 'pids.txt'
    if (Test-Path $pf) {
        $lines = @(Get-Content $pf)
        [array]::Reverse($lines)
        foreach ($l in $lines) {
            $parts = $l -split ' '
            if ($parts.Count -ge 2) { Stop-Process -Id ([int]$parts[1]) -Force -ErrorAction SilentlyContinue }
        }
        Remove-Item $pf -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path (Join-Path $Data 'pgdata\postmaster.pid')) {
        [void](Run-Quiet (Join-Path $Pg 'pg_ctl.exe') @('-D', (Join-Path $Data 'pgdata'), '-m', 'fast', '-w', 'stop') 'pgctl-stop' 120)
    }
}
if ($MyInvocation.InvocationName -ne '.') { Stop-All; Write-Host 'Clinic system stopped.' }
