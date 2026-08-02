"""
Passenger WSGI entry point for shared hosting (WebHostMost / DirectAdmin / cPanel).
App Root Target: domains/api.hisob.in/hissob-app/backend
"""
import sys
import os

os.environ["SERVER_ENV"] = "passenger"

# ── Ensure backend directory is on Python path ────────────────────────────────
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

if os.path.exists(os.path.join(CURRENT_DIR, "app", "main.py")):
    BACKEND_DIR = CURRENT_DIR
elif os.path.exists(os.path.join(CURRENT_DIR, "backend", "app", "main.py")):
    BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
else:
    BACKEND_DIR = CURRENT_DIR

os.chdir(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── Load environment variables (.env) ────────────────────────────────────────
from dotenv import load_dotenv
env_path = os.path.join(BACKEND_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)

for _subdir in ("uploads", "uploads/bills", "logs", "backups"):
    os.makedirs(os.path.join(BACKEND_DIR, _subdir), exist_ok=True)

# ── Lazy ASGI Initialization to Prevent Fork Deadlocks ───────────────────────
_application = None

def application(environ, start_response):
    global _application
    if _application is None:
        try:
            from app.main import app as _asgi_app
            from a2wsgi import ASGIMiddleware
            _application = ASGIMiddleware(_asgi_app)
        except Exception as e:
            body = f"Initialization Error: {str(e)}".encode('utf-8')
            start_response("500 Internal Server Error", [
                ("Content-Type", "text/plain"),
                ("Content-Length", str(len(body)))
            ])
            return [body]

    return _application(environ, start_response)
