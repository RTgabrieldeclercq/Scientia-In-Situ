@echo off
REM Scientia In Situ - serves the app on a FIXED localhost origin (http://localhost:8766).
REM Storage belongs to the origin: never change the port, or you get a different, empty database.
cd /d "%~dp0"
REM stop an older server still holding the port (it may be serving an old copy of the app)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8766 .*LISTENING"') do taskkill /PID %%p /F >nul 2>&1
REM build the app from src/ first: scientia.html and board.html are not in git, so a fresh clone (or a pull) has none or an old one
python build.py
python serve.py
