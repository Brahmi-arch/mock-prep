@echo off
cd /d "%~dp0"
if not exist .venv (py -3 -m venv .venv)
if errorlevel 1 goto error
.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto error
if not exist .env (copy .env.example .env & echo Created .env. Paste a valid Gemini API key into this file to activate AI.)
echo.
echo Mock Preparation AI starting at http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn server:app --env-file .env --host 127.0.0.1 --port 8000 --reload
pause
exit /b 0
:error
echo Setup failed. Ensure Python 3.10 or newer is installed and accessible with the py command.
pause
exit /b 1
