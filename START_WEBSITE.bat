@echo off
title Coal Intelligence Platform - Unified Launcher
color 0E
setlocal enabledelayedexpansion

:: Switch working directory to the platform root folder
cd /d "%~dp0"

echo ===============================================================================
echo   COAL INTELLIGENCE PLATFORM -- MINISTRY OF COAL, GOVT OF INDIA
echo   Starting all platform components...
echo ===============================================================================
echo.

:: Detect Python executable
set "PYTHON_CMD="
where python >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=py"
    )
)

if "!PYTHON_CMD!"=="" (
    color 0C
    echo [ERROR] Python was not found in system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [1/3] Python detected: !PYTHON_CMD!
echo [2/3] Initializing Backend, Database, and React Frontend...
echo [3/3] Opening browser directly to http://localhost:5173/login
echo.
echo -------------------------------------------------------------------------------
echo Press Ctrl+C in this window anytime to stop all servers cleanly.
echo -------------------------------------------------------------------------------
echo.

:: Launch unified runner which coordinates backend, database, frontend and browser
!PYTHON_CMD! run_all.py

if errorlevel 1 (
    echo.
    echo [NOTE] Server terminated.
    pause
)
