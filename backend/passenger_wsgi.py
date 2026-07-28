import sys
import os

os.environ["SERVER_ENV"] = "passenger"

# ── Ensure backend directory is first on Python path ────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── Load production .env ─────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(BACKEND_DIR, ".env"), override=True)

for _subdir in ("uploads", "logs", "backups"):
    os.makedirs(os.path.join(BACKEND_DIR, _subdir), exist_ok=True)


# ── Lazy ASGI Initialization to Prevent Fork Deadlocks ───────────────────────
# In Passenger, the master process imports this file, then forks workers.
# If a2wsgi creates background threads or asyncio loops during import,
# the fork process destroys or orphans those threads, causing infinite loading.
# By lazily instantiating ASGIMiddleware INSIDE the first request, 
# we ensure the threads are safely created inside the worker process!

_application = None

def application(environ, start_response):
    global _application
    if _application is None:
        try:
            from app.main import app as _asgi_app
            from a2wsgi import ASGIMiddleware
            _application = ASGIMiddleware(_asgi_app)
        except Exception as e:
            # If import fails, show the error on the webpage instead of 500/hanging
            body = f"Initialization Error: {str(e)}".encode('utf-8')
            start_response("500 Internal Server Error", [
                ("Content-Type", "text/plain"),
                ("Content-Length", str(len(body)))
            ])
            return [body]

    return _application(environ, start_response)
