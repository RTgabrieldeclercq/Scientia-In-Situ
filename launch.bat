@echo off
REM Scientia In Situ - serves the app on a FIXED localhost origin (http://localhost:8766).
REM Storage belongs to the origin: never change the port, or you get a different, empty database.
cd /d "%~dp0"
REM stop an older server still holding the port (it may be serving an old copy of the app)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8766 .*LISTENING"') do taskkill /PID %%p /F >nul 2>&1
python serve.py
