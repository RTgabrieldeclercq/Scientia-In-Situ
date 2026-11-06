@echo off
REM Checks why a phone or tablet can't pair; writes pairing-report.txt in this folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose-pairing.ps1"
pause
