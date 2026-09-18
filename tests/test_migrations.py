"""Проверки явного применения миграций на временной БД."""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.db import (
    MigrationError,
    apply_migrations,
    connect,
    migration_files,
    schema_version,
)


def write_migration(directory: Path, name: str, sql: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / name).write_text(sql, encoding="utf-8")


def test_schema_version_is_zero_without_migrations(temp_database: Path) -> None:
    connection = connect(temp_database)
    try:
        assert schema_version(connection) == 0
    finally:
        connection.close()


def test_migrations_apply_once(tmp_path: Path) -> None:
    migrations_dir = tmp_path / "migrations"
    write_migration(
        migrations_dir,
        "0001_create_users.sql",
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);",
    )
    write_migration(
        migrations_dir,
        "0002_create_sessions.sql",
        "CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, token_hash TEXT NOT NULL);",
    )
    database_path = tmp_path / "app.sqlite"

    assert apply_migrations(database_path, migrations_dir) == [1, 2]
    assert apply_migrations(database_path, migrations_dir) == []

    connection = connect(database_path)
    try:
        assert schema_version(connection) == 2
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
    finally:
        connection.close()

    assert {"users", "sessions", "schema_migrations"} <= tables


def test_invalid_migration_name_is_rejected(tmp_path: Path) -> None:
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "users.sql", "CREATE TABLE users (id INTEGER);")

    with pytest.raises(MigrationError):
        migration_files(migrations_dir)


def test_failed_migration_is_not_recorded(tmp_path: Path) -> None:
    migrations_dir = tmp_path / "migrations"
    write_migration(migrations_dir, "0001_broken.sql", "CREATE TABLE (;")
    database_path = tmp_path / "app.sqlite"

    with pytest.raises(MigrationError):
        apply_migrations(database_path, migrations_dir)

    connection = connect(database_path)
    try:
        assert schema_version(connection) == 0
    finally:
        connection.close()