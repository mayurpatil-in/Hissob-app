"""
Pytest configuration and global fixtures for Hissob ERP backend test suite.
"""
import os
import sys
import pytest
import uuid
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["PYTHONUTF8"] = "1"
os.environ["ENVIRONMENT"] = "testing"

from app.main import app, limiter
from app.routers import auth as auth_router
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, UserStatus
from app.models.financial_year import FinancialYear, FYStatus
from app.auth.jwt import create_access_token

# Disable rate limiting globally across test suite
limiter.enabled = False
auth_router.limiter.enabled = False


@pytest.fixture(scope="session")
def engine():
    """Session-wide database engine."""
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)
    yield engine


@pytest.fixture(scope="function")
def db(engine):
    """Function-scoped DB session wrapped in a transaction rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db):
    """FastAPI TestClient with overridden get_db dependency and disabled rate limiter for tests."""
    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    limiter.enabled = False
    app.state.limiter.enabled = False
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    limiter.enabled = True
    app.state.limiter.enabled = True


@pytest.fixture(scope="function")
def test_tenant(db):
    """Creates a seeded Tenant organization."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Ganesh Utsav Mandal",
        slug=f"test-mandal-{uuid.uuid4().hex[:6]}",
        email=f"mandal-{uuid.uuid4().hex[:6]}@hisob.in",
        status=TenantStatus.ACTIVE,
        is_active=True,
    )
    db.add(tenant)
    db.flush()
    return tenant


@pytest.fixture(scope="function")
def test_fy(db, test_tenant):
    """Creates a seeded Financial Year for the tenant."""
    fy = FinancialYear(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        name="2025-26",
        start_date=date(2025, 4, 1),
        end_date=date(2026, 3, 31),
        is_current=True,
        status=FYStatus.ACTIVE,
    )
    db.add(fy)
    db.flush()
    return fy


@pytest.fixture(scope="function")
def test_user(db, test_tenant):
    """Creates a seeded active User with admin permissions for test suite."""
    user = User(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        email=f"user-{uuid.uuid4().hex[:6]}@hisob.in",
        full_name="Tester User",
        hashed_password=hash_password("TestP@ss123!"),
        is_active=True,
        is_super_admin=True,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user, test_tenant):
    """Returns Bearer token and X-Tenant-ID headers for authenticated requests."""
    token = create_access_token(data={"sub": str(test_user.id), "tenant_id": str(test_tenant.id)})
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(test_tenant.id),
    }


@pytest.fixture(scope="function")
def super_admin_user(db):
    """Creates a seeded Super Admin User."""
    admin = User(
        id=uuid.uuid4(),
        tenant_id=None,
        email=f"admin-{uuid.uuid4().hex[:6]}@hisob.in",
        full_name="Super Admin",
        hashed_password=hash_password("AdminP@ss123!"),
        is_active=True,
        is_super_admin=True,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.flush()
    return admin


@pytest.fixture(scope="function")
def super_admin_headers(super_admin_user):
    """Returns Bearer token for Super Admin."""
    token = create_access_token(data={"sub": str(super_admin_user.id), "tenant_id": None})
    return {"Authorization": f"Bearer {token}"}
