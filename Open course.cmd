@echo off
rem Double-click to open the course at http://localhost:8000 (progress is shared by every page).
rem Keep this window open while you study; close it to stop the server.
cd /d "%~dp0"
python tools\serve.py
