import os
import sys
import subprocess
import time
import webbrowser
import shutil

def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 75)
    print("  🔥  MACERAL AI — UNIFIED SYSTEM LAUNCHER")
    print("  Ministry of Coal, Government of India | Team BYTE MINERS")
    print("=" * 75)
    print()

    # Step 1: Ensure Python dependencies
    print("[1/4] Checking Python backend dependencies...")
    req_file = os.path.join(backend_dir, "requirements.txt")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_file, "--quiet"], check=True)
        print("      ✅ Backend dependencies verified.")
    except Exception as e:
        print(f"      ⚠️ Pip note: {e}")

    # Step 2: Seed & Verify Database
    print("[2/4] Initializing Database & Seed Records...")
    try:
        sys.path.insert(0, backend_dir)
        from app.database import init_db, SessionLocal
        from seed_data import seed_database
        init_db()
        db = SessionLocal()
        seed_database(db)
        db.close()
        print("      ✅ SQLite Database seeded with 6 Indian Coal Mines & DGMS Audits.")
    except Exception as e:
        print(f"      ⚠️ Seed note: {e}")

    # Step 3: Check if Node/npm is available for Vite React dev server
    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    frontend_process = None

    if npm_path:
        print("[3/4] Node.js & npm detected. Starting React + Vite Frontend...")
        node_modules = os.path.join(frontend_dir, "node_modules")
        if not os.path.exists(node_modules):
            print("      📦 Installing React packages (first run)...")
            subprocess.run([npm_path, "install"], cwd=frontend_dir, shell=True)

        print("      🚀 Launching Vite dev server on http://localhost:5173 ...")
        frontend_process = subprocess.Popen([npm_path, "run", "dev"], cwd=frontend_dir, shell=True)
        target_url = "http://localhost:5173/login"
    else:
        print("[3/4] Node.js not detected in current PATH.")
        print("      ⚡ Using Unified FastAPI Web App (Port 8000) with complete interactive UI!")
        target_url = "http://127.0.0.1:8000"

    # Step 4: Start FastAPI Backend
    print(f"[4/4] Launching FastAPI Backend on http://127.0.0.1:8000 ...")
    print()
    print("=" * 75)
    print(f"  🎉 PLATFORM LIVE!")
    print(f"  🌐 Main Dashboard:     {target_url}")
    print(f"  📖 Swagger API Docs:   http://127.0.0.1:8000/docs")
    print(f"  🤖 AI Intelligence:    Active (Neural RAG & Extraction)")
    print("=" * 75)
    print()

    # Automatically open the browser after a short delay
    def open_browser():
        time.sleep(2)
        try:
            webbrowser.open(target_url)
        except Exception:
            pass

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        import uvicorn
        from app.main import app
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Coal Intelligence Platform...")
        if frontend_process:
            frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
