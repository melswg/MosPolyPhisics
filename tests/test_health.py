"""Проверки health-check и отсутствия демонаполнения."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient


def test_health_returns_ok_status(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reports_temporary_database(client: TestClient, temp_database: Path) -> None:
    response = client.get("/api/health")
    payload = response.json()

    assert payload["database"] == "ok"
    assert payload["schema_version"] == 0
    assert temp_database.is_file()


def test_health_uses_configured_database_path(client: TestClient, temp_database: Path) -> None:
    client.get("/api/health")

    connection = sqlite3.connect(temp_database)
    try:
        rows = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    finally:
        connection.close()

    assert {row[0] for row in rows} == {"schema_migrations"}


def test_startup_creates_no_public_demo_records(client: TestClient) -> None:
    client.get("/api/health")
    client.get("/")

    for path in ("/api/news", "/api/tests", "/api/calendar", "/api/videos"):
        assert client.get(path).status_code == 404