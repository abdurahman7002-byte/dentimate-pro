@echo off
cd /d "%~dp0"
echo Restore replaces the current data with a backup (current data is kept in a data-before-restore folder).
set /p BK=Type the full path of the backup folder (for example %~dp0backups\clinic-20260101-1200): 
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore.ps1" -From "%BK%"
pause
