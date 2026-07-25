"""
Passenger WSGI entry point for shared hosting (WebHostMost.com).
Place this file in your hosting root alongside the backend/ directory.

Passenger calls application() to get the WSGI app.
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Load environment
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from app.main import app as application
