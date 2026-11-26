@echo off
cd /d "%~dp0"
set BOOTSTRAP_PORT=39995
"%~dp0runtime\node\node.exe" "%~dp0app\server\bootstrap-owner.mjs"
pause
