@echo off
TITLE Coal Intelligence Platform - Ministry of Coal (BYTE MINERS)
color 0A

echo =========================================================================
echo   MINISTRY OF COAL - COAL INTELLIGENCE PLATFORM
echo   Unified AI Document Intelligence & Statutory Mine Governance
echo   Team: BYTE MINERS
echo =========================================================================
echo.

cd /d "%~dp0backend"

echo [1/3] Checking Python installation...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not found in PATH. Please install Python 3.9+ from python.org
    pause
    exit /b
)

echo.
echo [2/3] Installing / Verifying Python dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [WARNING] pip install returned a warning, continuing to server launch...
)

echo.
echo [3/3] Launching FastAPI Unified Server on http://127.0.0.1:8000 ...
echo   - Interactive Dashboard:  http://127.0.0.1:8000/
echo   - Swagger API Docs:       http://127.0.0.1:8000/docs
echo   - AI Intelligence Engine: Active (Neural RAG)
echo.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
