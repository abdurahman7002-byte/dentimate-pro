# Makes a Dentimate Pro icon and a desktop shortcut (only touches the current user's Desktop).
$Root = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Drawing
$ico = Join-Path $Root 'dentimate.ico'
$bmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(13, 148, 136))
$f = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
$g.DrawString('D', $f, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 0, 64, 64), $sf)
$h = $bmp.GetHicon(); $icon = [System.Drawing.Icon]::FromHandle($h)
$fs = [IO.File]::Create($ico); $icon.Save($fs); $fs.Close()
$desk = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desk 'Dentimate Pro.lnk'))
$lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$lnk.Arguments = '"' + (Join-Path $Root 'CLINIC-APP.vbs') + '"'
$lnk.WorkingDirectory = $Root
$lnk.IconLocation = $ico
$lnk.Save()
Write-Host 'Shortcut created on the Desktop: Dentimate Pro'
