"""
Hissob ERP — FastAPI Application Entry Point
"""
import os

# Enable UTF-8 mode globally for font parsing & file I/O
os.environ["PYTHONUTF8"] = "1"
import logging
import traceback
import warnings

# Suppress false fpdf2 PyFPDF namespace warnings and fontTools subset verbosity
warnings.filterwarnings("ignore", category=UserWarning, module="fpdf")
warnings.filterwarnings("ignore", message=".*PyFPDF.*")
logging.getLogger("fontTools").setLevel(logging.ERROR)
logging.getLogger("fontTools.subset").setLevel(logging.ERROR)

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.middleware.audit import AuditMiddleware
from app.middleware.audit import TenantMiddleware

# ─── Rate Limiter ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

class CORSStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        return response


# ─── App Factory ───────────────────────────────────────────────
def create_app() -> FastAPI:
    # Ensure all models are registered and database tables created if missing
    try:
        import app.models
        from app.core.database import Base
        from app.core.database import engine
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logging.getLogger("hisob.db").warning("Auto table creation check: %s", str(e))

    hide_docs = (settings.ENVIRONMENT == "production" or not settings.ENABLE_DOCS) and not settings.DEBUG
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production ERP for Festival Collection & Financial Management",
        docs_url=None if hide_docs else "/docs",
        redoc_url=None if hide_docs else "/redoc",
        openapi_url=None if hide_docs else "/openapi.json",
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Middleware (CORSMiddleware must be added FIRST so it wraps all requests)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"https://.*\.hisob\.in",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    app.add_middleware(TenantMiddleware)
    app.add_middleware(AuditMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ─── Global Exception Handler ──────────────────────────────
    # Ensures unhandled 500 errors still get CORS headers applied
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger = logging.getLogger("hissob.error")
        logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    # Routes
    app.include_router(api_v1_router, prefix="/api/v1")

    # Static file uploads
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", CORSStaticFiles(directory=upload_dir), name="uploads")

    # Health check
    @app.get("/health", tags=["Health"])
    async def health():
        db_status = "unhealthy"
        try:
            from sqlalchemy import text

            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                db.execute(text("SELECT 1"))
                db_status = "connected"
            except Exception as e:
                db_status = f"error: {str(e)}"
            finally:
                db.close()
        except Exception as e:
            db_status = f"error: {str(e)}"

        return {
            "status": "ok" if db_status == "connected" else "degraded",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "database": db_status,
        }

    return app


app = create_app()
