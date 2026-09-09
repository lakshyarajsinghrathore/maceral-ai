import os
import sys

# Ensure backend root directory is in sys.path for reliable module resolution
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .config import settings
from .database import init_db, SessionLocal
from .routers import documents, qa, reports, compliance, auth

# Create FastAPI application
app = FastAPI(
    title="Maceral AI API",
    description="Unified AI Document Intelligence & Compliance Governance for Ministry of Coal",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for local development and cloud deployments (Vercel, Render)
cors_origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for direct file downloads and previews
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.GENERATED_REPORTS_DIR, exist_ok=True)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/generated_reports", StaticFiles(directory=settings.GENERATED_REPORTS_DIR), name="generated_reports")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(qa.router)
app.include_router(reports.router)
app.include_router(compliance.router)

@app.on_event("startup")
def startup_event():
    """Initialize DB tables and seed realistic sample data on first run."""
    print("[STARTUP] Initializing Maceral AI Backend...")
    init_db()
    db = SessionLocal()
    try:
        from seed_data import seed_database
        seed_database(db)
    except Exception as e:
        print(f"[NOTE] Startup seed note: {e}")
    finally:
        db.close()
    print("[READY] Backend ready! API Docs live at http://localhost:8000/docs")

@app.get("/")
def root():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "platform": "Maceral AI (Ministry of Coal)",
        "team": "BYTE MINERS",
        "capabilities": ["Document Intelligence Engine", "Compliance Governance & Risk Auditing"],
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/info")
def platform_info():
    return {
        "platform": "Maceral AI (Ministry of Coal)",
        "team": "BYTE MINERS",
        "capabilities": ["Document Intelligence Engine", "Compliance Governance & Risk Auditing"],
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
@app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "database": "connected",
        "environment": settings.ENVIRONMENT
    }

# Catch-all for SPA client-side routing (excluding /api)
@app.get("/{full_path:path}")
def spa_catch_all(full_path: str):
    if full_path.startswith("api/"):
        return {"detail": "Not found"}
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"detail": "Not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
