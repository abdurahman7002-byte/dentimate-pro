@echo off
cd /d "%~dp0"
chcp 65001 >nul
set BOOTSTRAP_PORT=39995
"%~dp0runtime\node\node.exe" "%~dp0app\server\bootstrap-owner.mjs"
pause
