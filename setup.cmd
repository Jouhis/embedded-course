@echo off
rem Set up everything the course needs. Add --zephyr, --rust or --all for the optional parts,
rem or --portable to download portable tools instead of using winget (no admin rights needed).
rem A PATH that starts with ";" stops cmd from finding programs on some machines: drop it here.
if "%PATH:~0,1%"==";" set "PATH=%PATH:~1%"
cd /d "%~dp0"
python --version >nul 2>nul && (python tools\setup.py %* & pause & exit /b)
py -3 --version >nul 2>nul && (py -3 tools\setup.py %* & pause & exit /b)
echo Python is not installed. Install it from https://www.python.org/downloads/
echo (tick "Add python.exe to PATH"), or with: winget install -e --id Python.Python.3.13
echo Then open a new window and run setup.cmd again.
pause
exit /b 1
