@echo off
cd /d "%~dp0"
"%~dp0runtime\node\node.exe" "%~dp0app\server\bootstrap-owner.mjs"
pause
