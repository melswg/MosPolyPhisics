import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def auth_app(tmp_path, monkeypatch):
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(tmp_path / "auth.sqlite"))
    monkeypatch.setenv("SESSION_COOKIE_SECURE", "false")
    import backend.main as main

    importlib.reload(main)
    with TestClient(main.app) as client:
        yield client, main


def register(client: TestClient):
    return client.post(
        "/api/register",
        json={"username": "student_1", "email": "student@example.org", "password": "physics2026"},
    )


def test_registration_session_and_csrf_logout(auth_app):
    client, _ = auth_app

    weak = client.post(
        "/api/register",
        json={"username": "ab", "email": "wrong", "password": "123"},
    )
    assert weak.status_code == 422

    response = register(client)
    assert response.status_code == 201
    assert "mospoly_session" in response.cookies
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "access_token" not in response.json()

    profile = client.get("/api/user/me")
    assert profile.status_code == 200
    assert profile.json()["email"] == "student@example.org"

    assert client.post("/api/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    csrf_token = profile.json()["csrf_token"]
    assert client.post("/api/logout", headers={"X-CSRF-Token": csrf_token}).status_code == 204
    assert client.get("/api/user/me").status_code == 401


def test_password_reset_is_single_use_and_revokes_sessions(auth_app, monkeypatch):
    client, main = auth_app
    assert register(client).status_code == 201
    reset_token = "r" * 48
    monkeypatch.setattr(main.secrets, "token_urlsafe", lambda _length: reset_token)
    monkeypatch.setattr(main, "send_password_reset", lambda _email, _url: True)

    requested = client.post("/api/password-reset/request", json={"email": "student@example.org"})
    assert requested.status_code == 200

    changed = client.post(
        "/api/password-reset/confirm",
        json={"token": reset_token, "new_password": "newphysics2026"},
    )
    assert changed.status_code == 200
    assert client.get("/api/user/me").status_code == 401
    assert client.post(
        "/api/password-reset/confirm",
        json={"token": reset_token, "new_password": "another2026"},
    ).status_code == 400
    assert client.post(
        "/api/login", json={"username": "student_1", "password": "physics2026"}
    ).status_code == 401
    assert client.post(
        "/api/login", json={"username": "student_1", "password": "newphysics2026"}
    ).status_code == 200
