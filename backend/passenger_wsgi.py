"""
Passenger WSGI entry point for shared hosting (WebHostMost / DirectAdmin / cPanel).
App Root Target: domains/api.hisob.in/hissob-app/backend

Passenger calls application() to get the WSGI app.
Since FastAPI is an ASGI application, we wrap it with a2wsgi for Phusion Passenger.
"""
import sys
import os

# Determine directory containing app/ main module
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

if os.path.exists(os.path.join(CURRENT_DIR, "app", "main.py")):
    BACKEND_DIR = CURRENT_DIR
elif os.path.exists(os.path.join(CURRENT_DIR, "backend", "app", "main.py")):
    BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
else:
    BACKEND_DIR = CURRENT_DIR

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load environment variables (.env or .env.production)
from dotenv import load_dotenv
env_path = os.path.join(BACKEND_DIR, ".env")
env_prod_path = os.path.join(BACKEND_DIR, ".env.production")
if os.path.exists(env_path):
    load_dotenv(env_path)
elif os.path.exists(env_prod_path):
    load_dotenv(env_prod_path)

from app.main import app as fastapi_app
from a2wsgi import ASGIMiddleware

# Phusion Passenger entrypoint
application = ASGIMiddleware(fastapi_app)
