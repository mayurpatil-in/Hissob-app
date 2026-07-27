"""
Passenger WSGI entry point for shared hosting (WebHostMost.com / cPanel).
Place this file in your hosting application directory alongside backend/.

Passenger calls application() to get the WSGI app.
Since FastAPI is an ASGI application, we wrap it with a2wsgi to run seamlessly on Passenger WSGI.
"""
import sys
import os

# Add backend to python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from app.main import app as fastapi_app
from a2wsgi import ASGIMiddleware

# Phusion Passenger entrypoint
application = ASGIMiddleware(fastapi_app)

