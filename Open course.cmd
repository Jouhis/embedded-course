@echo off
rem Double-click to open the course at http://localhost:8000 (progress is shared by every page).
rem Keep this window open while you study; close it to stop the server.
rem A PATH that starts with ";" stops cmd from finding programs on some machines: drop it here.
if "%PATH:~0,1%"==";" set "PATH=%PATH:~1%"
cd /d "%~dp0"
python --version >nul 2>nul && (python tools\serve.py & exit /b)
py -3 --version >nul 2>nul && (py -3 tools\serve.py & exit /b)
echo Python is not installed. Install it from https://www.python.org/downloads/
echo (tick "Add python.exe to PATH"), then double-click this file again.
echo You can also open index.html directly in your browser.
pause
exit /b 1
