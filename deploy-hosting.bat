@echo off
rem Puts the app on Firebase Hosting (needs Python and Node.js). See hosting.py for the one-time setup.
cd /d "%~dp0"
python hosting.py || goto :end
cd hosting
call npx -y firebase-tools@latest login
call npx -y firebase-tools@latest deploy --only hosting
:end
pause
