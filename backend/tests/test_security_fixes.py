"""
Pytest unit tests for Phase 1 Security Fixes.
"""
import inspect
import pytest
from app.schemas.auth import ResetPasswordRequest, ChangePasswordRequest, TOTPDisableRequest
from app.routers import auth as auth_module
from app.routers.cron import CRON_SECRET_KEY, verify_cron_key
from app.models.receipt import Receipt
from app.main import create_app


def test_password_complexity_validation():
    weak_passwords = ["short1", "alllowercase1!", "ALLUPPERCASE1!", "NoSpecialChar1", "nodigits!A"]
    for wp in weak_passwords:
        with pytest.raises(ValueError):
            ResetPasswordRequest(token="test", new_password=wp)

    req = ResetPasswordRequest(token="test", new_password="StrongP@ss1")
    assert req.new_password == "StrongP@ss1"


def test_totp_disable_requires_password():
    with pytest.raises(ValueError):
        TOTPDisableRequest()

    req = TOTPDisableRequest(password="mypassword")
    assert req.password == "mypassword"


def test_cron_secret_key_no_hardcoded_bypass():
    source = inspect.getsource(verify_cron_key)
    assert "hisob-cron-secret-396" not in source


def test_receipt_tenant_scoped_uniqueness():
    table_args = Receipt.__table_args__
    has_composite_uq = any(
        hasattr(arg, "name") and "uq_receipts_tenant_receipt_number" in (arg.name or "")
        for arg in table_args
    )
    assert has_composite_uq is True

    rn_col = Receipt.__table__.columns.get("receipt_number")
    assert rn_col is not None
    assert rn_col.unique is False or rn_col.unique is None


def test_password_reset_token_expiry_1hour():
    auth_source = inspect.getsource(auth_module.forgot_password)
    assert "timedelta(hours=1)" in auth_source


def test_account_lockout_configuration():
    login_source = inspect.getsource(auth_module.login)
    assert "_failed_logins" in login_source
    assert hasattr(auth_module, "_MAX_FAILED_ATTEMPTS")
    assert getattr(auth_module, "_MAX_FAILED_ATTEMPTS") == 5
    assert hasattr(auth_module, "_LOCKOUT_DURATION_MINUTES")
    assert getattr(auth_module, "_LOCKOUT_DURATION_MINUTES") == 30


def test_health_check_finally_db_close():
    main_source = inspect.getsource(create_app)
    assert "finally:" in main_source
    assert "db.close()" in main_source
