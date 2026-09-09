@echo off
title Coal Intelligence Platform - BYTE MINERS
color 0A
setlocal enabledelayedexpansion

echo.
echo  =========================================================================
echo    COAL INTELLIGENCE PLATFORM  ^|  Ministry of Coal, Govt. of India
echo    Team: BYTE MINERS
echo  =========================================================================
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

:: ── [1/4] Python check ───────────────────────────────────────────────────────
echo  [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install Python 3.9+ from https://python.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo         %%v found.

:: ── [2/4] Backend dependencies ───────────────────────────────────────────────
echo.
echo  [2/4] Installing / verifying backend Python packages...
pip install -r "%BACKEND%\requirements.txt" --quiet 2>nul
pip install bcrypt --quiet 2>nul
echo         Backend packages ready.

:: ── [3/4] Frontend (Node / Vite) ─────────────────────────────────────────────
echo.
echo  [3/4] Checking for Node.js / npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo         Node.js not found — skipping React dev server.
    echo         The full UI is served by FastAPI at http://127.0.0.1:8000
    set "FRONTEND_RUNNING=0"
    set "OPEN_URL=http://127.0.0.1:8000"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo         Node %%v found.
    if not exist "%FRONTEND%\node_modules" (
        echo         Installing React packages ^(first run, please wait^)...
        cd /d "%FRONTEND%"
        call npm install --silent
    )
    echo         Launching Vite dev server on http://localhost:5173 ...
    start "Coal Platform - React Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm run dev"
    set "FRONTEND_RUNNING=1"
    set "OPEN_URL=http://localhost:5173/login"
    :: Give Vite a moment to start
    timeout /t 3 /nobreak >nul
)

:: ── [4/4] FastAPI backend ─────────────────────────────────────────────────────
echo.
echo  [4/4] Launching FastAPI backend on http://127.0.0.1:8000 ...
start "Coal Platform - FastAPI Backend" cmd /k "cd /d ""%BACKEND%"" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Give the backend a moment to boot, then open browser
echo.
echo  =========================================================================
if "!FRONTEND_RUNNING!"=="1" (
    echo    Dashboard  :  http://localhost:5173       ^(React UI^)
    echo    Backend    :  http://127.0.0.1:8000      ^(FastAPI^)
) else (
    echo    Dashboard  :  http://127.0.0.1:8000      ^(FastAPI + built-in UI^)
)
echo    API Docs   :  http://127.0.0.1:8000/docs
echo  =========================================================================
echo.
echo  Both services are running in their own windows.
echo  Close those windows (or press Ctrl+C inside them) to stop.
echo.

timeout /t 4 /nobreak >nul
start "" "!OPEN_URL!"

endlocal
pause
