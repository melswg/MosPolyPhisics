import importlib
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.models import connect


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
        json={
            "username": "student_1",
            "email": "student@example.org",
            "password": "physics2026",
            "accepted_personal_data_processing": True,
        },
    )


def test_registration_session_and_csrf_logout(auth_app):
    client, main = auth_app

    weak = client.post(
        "/api/register",
        json={
            "username": "ab",
            "email": "wrong",
            "password": "123",
            "accepted_personal_data_processing": True,
        },
    )
    assert weak.status_code == 422

    missing_consent = client.post(
        "/api/register",
        json={"username": "student_1", "email": "student@example.org", "password": "physics2026"},
    )
    assert missing_consent.status_code == 422

    response = register(client)
    assert response.status_code == 201
    assert "mospoly_session" in response.cookies
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "access_token" not in response.json()

    with connect() as connection:
        stored = connection.execute(
            """
            SELECT password, personal_data_consent_at, personal_data_consent_version
            FROM users WHERE username = ?
            """,
            ("student_1",),
        ).fetchone()
    assert stored["password"].startswith("$argon2")
    assert stored["personal_data_consent_at"]
    assert stored["personal_data_consent_version"] == main.PERSONAL_DATA_CONSENT_VERSION

    profile = client.get("/api/user/me")
    assert profile.status_code == 200
    assert profile.json()["email"] == "student@example.org"

    assert client.post("/api/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    csrf_token = profile.json()["csrf_token"]
    assert client.post("/api/logout", headers={"X-CSRF-Token": csrf_token}).status_code == 204
    assert client.get("/api/user/me").status_code == 401


def test_new_reset_link_replaces_previous_unexpired_link(auth_app, monkeypatch):
    client, main = auth_app
    assert register(client).status_code == 201
    sent = []
    monkeypatch.setattr(main, "send_password_reset", lambda email, url: sent.append(url) or True)
    client.post("/api/password-reset/request", json={"email": "student@example.org"})
    old_token = sent[-1].split("#token=", 1)[1]
    with connect() as connection:
        connection.execute("UPDATE password_reset_tokens SET expires_at = ?", (
            (datetime.now(timezone.utc) + timedelta(minutes=28)).isoformat(),
        ))
        connection.commit()
    client.post("/api/password-reset/request", json={"email": "student@example.org"})
    assert len(sent) == 2
    assert client.post("/api/password-reset/confirm", json={
        "token": old_token, "new_password": "newphysics2026",
    }).status_code == 400


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


def test_reset_email_link_and_cooldown_do_not_expose_accounts(auth_app, monkeypatch):
    client, main = auth_app
    assert register(client).status_code == 201
    sent = []
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://mospolyphysics.ru")
    monkeypatch.setattr(main, "send_password_reset", lambda email, url: sent.append((email, url)) or True)
    first = client.post("/api/password-reset/request", json={"email": "student@example.org"})
    repeated = client.post("/api/password-reset/request", json={"email": "student@example.org"})
    unknown = client.post("/api/password-reset/request", json={"email": "unknown@example.org"})
    assert first.json() == repeated.json() == unknown.json()
    assert len(sent) == 1
    assert sent[0][1].startswith("https://mospolyphysics.ru/password-reset/confirm#token=")
    token = sent[0][1].split("#token=", 1)[1]
    with connect() as connection:
        stored = connection.execute("SELECT token_hash FROM password_reset_tokens").fetchone()[0]
    assert stored == main._token_hash(token)
    assert stored != token


def test_reset_expiry_replacement_and_validation(auth_app, monkeypatch):
    client, main = auth_app
    assert register(client).status_code == 201
    sent = []
    monkeypatch.setattr(main, "send_password_reset", lambda email, url: sent.append(url) or True)
    client.post("/api/password-reset/request", json={"email": "student@example.org"})
    old_token = sent[-1].split("#token=", 1)[1]
    with connect() as connection:
        connection.execute("UPDATE password_reset_tokens SET expires_at = '2000-01-01T00:00:00+00:00'")
        connection.commit()
    assert client.post("/api/password-reset/confirm", json={
        "token": old_token, "new_password": "newphysics2026",
    }).status_code == 400
    client.post("/api/password-reset/request", json={"email": "student@example.org"})
    token = sent[-1].split("#token=", 1)[1]
    assert token != old_token
    assert client.post("/api/password-reset/confirm", json={
        "token": token, "new_password": "weak",
    }).status_code == 422
    assert client.get("/api/user/me").status_code == 200
    assert client.post("/api/password-reset/confirm", json={
        "token": token, "new_password": "newphysics2026",
    }).status_code == 200
    assert client.get("/api/user/me").status_code == 401
