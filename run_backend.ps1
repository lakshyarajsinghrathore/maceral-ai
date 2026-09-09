# =========================================================================
#   MINISTRY OF COAL - COAL INTELLIGENCE PLATFORM
#   Unified AI Document Intelligence & Statutory Mine Governance
#   Team: BYTE MINERS
# =========================================================================

Write-Host "=========================================================================" -ForegroundColor Gold
Write-Host "  MINISTRY OF COAL - COAL INTELLIGENCE PLATFORM" -ForegroundColor White
Write-Host "  Unified AI Document Intelligence & Statutory Mine Governance" -ForegroundColor Cyan
Write-Host "  Team: BYTE MINERS" -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Gold
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\backend"

Write-Host "[1/3] Verifying Python runtime..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "Found: $pythonVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Installing/verifying backend dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

Write-Host ""
Write-Host "[3/3] Launching Unified FastAPI Platform..." -ForegroundColor Yellow
Write-Host "  ➔ Web Dashboard:     http://127.0.0.1:8000/" -ForegroundColor Cyan
Write-Host "  ➔ Swagger API Docs:  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  ➔ AI Engine:         Active (Neural RAG)" -ForegroundColor Green
Write-Host ""

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
