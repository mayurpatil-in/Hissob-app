"""
Integration test suite for Authentication & Authorization APIs.
"""
import pytest
from app.routers import auth as auth_router


def test_login_success(client, test_user):
    response = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "TestP@ss123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_user.email


def test_login_invalid_password_returns_401(client, test_user):
    response = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword123!",
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_account_lockout_after_max_failed_attempts(client):
    email = "lockout_test_user@hisob.in"
    auth_router._failed_logins.clear()
    # Attempt 5 failed logins
    for i in range(5):
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword!"})
        if i < 4:
            assert resp.status_code == 401
        else:
            assert resp.status_code == 429
            assert "locked" in resp.json()["detail"].lower()

    # Clean up test lockout state
    auth_router._failed_logins.pop(email.lower().strip(), None)


def test_get_current_user_me(client, auth_headers, test_user):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["email"] == test_user.email


def test_totp_setup_and_disable_validation(client, auth_headers, test_user):
    # Setup TOTP
    setup_resp = client.post("/api/v1/auth/totp/setup", headers=auth_headers)
    assert setup_resp.status_code == 200
    data = setup_resp.json()
    assert "secret" in data
    assert "qr_code_base64" in data

    # Disable TOTP without password should fail validation (422 Unprocessable Entity)
    disable_no_pass = client.post("/api/v1/auth/totp/disable", headers=auth_headers, json={})
    assert disable_no_pass.status_code == 422

    # Disable TOTP with wrong password should fail (400 Bad Request)
    disable_wrong_pass = client.post("/api/v1/auth/totp/disable", headers=auth_headers, json={"password": "WrongPassword!"})
    assert disable_wrong_pass.status_code == 400

    # Disable TOTP with correct password should succeed
    disable_ok = client.post("/api/v1/auth/totp/disable", headers=auth_headers, json={"password": "TestP@ss123!"})
    assert disable_ok.status_code == 200
    assert "disabled" in disable_ok.json()["message"].lower()


def test_change_password_complexity(client, auth_headers):
    # Weak new password (no special char) should fail
    resp_weak = client.post("/api/v1/auth/change-password", headers=auth_headers, json={
        "current_password": "TestP@ss123!",
        "new_password": "WeakPassword1",
    })
    assert resp_weak.status_code == 422

    # Valid strong password should succeed
    resp_ok = client.post("/api/v1/auth/change-password", headers=auth_headers, json={
        "current_password": "TestP@ss123!",
        "new_password": "NewStrongP@ss1",
    })
    assert resp_ok.status_code == 200
