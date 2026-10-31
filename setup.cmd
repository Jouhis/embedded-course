@echo off
rem Set up everything the course needs. Add --zephyr, --rust or --all for the optional parts.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python is not installed. Run: winget install -e --id Python.Python.3.13 & echo then open a new terminal and run setup.cmd again. & pause & exit /b 1)
python tools\setup.py %*
pause
