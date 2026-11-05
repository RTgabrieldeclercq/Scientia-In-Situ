@echo off
rem Scientia In Situ — builds ScientiaPen.exe (the pen's button) next to this file with the C# compiler Windows ships.
setlocal
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
if not exist "%CSC%" ( echo The C# compiler was not found ^(.NET Framework 4 is needed^). & pause & exit /b 1 )
"%CSC%" /nologo /optimize+ /target:winexe /out:"%~dp0ScientiaPen.exe" "%~dp0ScientiaPen.cs"
if exist "%~dp0ScientiaPen.exe" ( echo Built ScientiaPen.exe — assign it in Windows Settings ^> Pen ^> Pen shortcut button ^> Launch a classic app. ) else ( echo The build failed. )
pause
