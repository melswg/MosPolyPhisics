import importlib
import json
import sqlite3

from fastapi.testclient import TestClient
import pytest

from backend.models import connect, init_db


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(tmp_path / "avatar.sqlite"))
    monkeypatch.setenv("SESSION_COOKIE_SECURE", "false")
    import backend.main as main
    importlib.reload(main)
    with TestClient(main.app) as client:
        yield client


def register(client, name="avatar_one"):
    response = client.post("/api/register", json={"username": name, "email": name + "@example.org",
        "password": "physics2026", "accepted_personal_data_processing": True})
    assert response.status_code == 201
    return client.get("/api/user/me").json()


def test_avatar_requires_session_and_csrf_and_is_persisted_for_only_its_owner(client):
    preset = client.get("/api/avatar/options").json()["presets"][1]["config"]
    assert client.post("/api/user/avatar", json=preset).status_code == 401
    first = register(client)
    token = first["csrf_token"]
    assert first["avatar"]["color"] == "purple"
    assert client.post("/api/user/avatar", json=preset).status_code == 403
    assert client.post("/api/user/avatar", json=preset, headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert client.post("/api/user/avatar", json=preset, headers={"X-CSRF-Token": token}).status_code == 200
    assert client.get("/api/user/me").json()["avatar"] == preset
    with connect() as conn:
        assert json.loads(conn.execute("SELECT avatar_config FROM users WHERE id=?", (first["id"],)).fetchone()[0]) == preset
    assert client.post("/api/logout", headers={"X-CSRF-Token": token}).status_code == 204
    second = register(client, "avatar_two")
    assert second["avatar"]["color"] == "purple"
    assert client.post("/api/login", json={"username": "avatar_one", "password": "physics2026"}).status_code == 200
    assert client.get("/api/user/me").json()["avatar"] == preset


@pytest.mark.parametrize("patch", [
    {"color": "javascript:alert(1)"}, {"accessory": "<svg onload=alert(1)>"},
    {"user_id": 999}, {"outfit": "unknown"}, {"face": None},
])
def test_avatar_rejects_arbitrary_parts_and_owner_overrides(client, patch):
    user = register(client)
    config = {**user["avatar"], **patch}
    assert client.post("/api/user/avatar", json=config, headers={"X-CSRF-Token": user["csrf_token"]}).status_code == 422
    assert client.get("/api/user/me").json()["avatar"] == user["avatar"]


def test_avatar_migration_preserves_old_users_and_repeat_initialization(tmp_path):
    database = tmp_path / "previous.sqlite"
    assert init_db(database)
    with sqlite3.connect(database) as conn:
        conn.execute("ALTER TABLE users DROP COLUMN avatar_config")
        conn.execute("DELETE FROM schema_migrations WHERE version=6")
        conn.execute("INSERT INTO users(username,email,password) VALUES ('existing','existing@example.org','keep')")
    assert init_db(database)
    assert init_db(database)
    with sqlite3.connect(database) as conn:
        row = conn.execute("SELECT username,password,avatar_config FROM users").fetchone()
        assert row == ("existing", "keep", "{}")
