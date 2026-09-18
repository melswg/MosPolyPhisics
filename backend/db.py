"""Подключение к SQLite и явные версионируемые миграции.

Обычный старт приложения не применяет миграции и ничего не наполняет данными.
Миграции запускаются отдельной командой scripts/migrate.py.
"""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
MIGRATION_NAME_PATTERN = re.compile(r"^(\d{4})_[a-z0-9_]+\.sql$")

SCHEMA_MIGRATIONS_DDL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


class MigrationError(RuntimeError):
    """Ошибка в наборе файлов миграций."""


def connect(database_path: Path | str) -> sqlite3.Connection:
    """Открывает соединение и создаёт только служебную таблицу версий схемы."""
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute(SCHEMA_MIGRATIONS_DDL)
    return connection


def applied_versions(connection: sqlite3.Connection) -> set[int]:
    """Уже применённые версии схемы."""
    rows = connection.execute("SELECT version FROM schema_migrations").fetchall()
    return {int(row["version"]) for row in rows}


def schema_version(connection: sqlite3.Connection) -> int:
    """Текущая версия схемы, 0 пока нет ни одной доменной миграции."""
    row = connection.execute(
        "SELECT MAX(version) AS version FROM schema_migrations"
    ).fetchone()
    return int(row["version"] or 0)


def migration_files(migrations_dir: Path | str = MIGRATIONS_DIR) -> list[tuple[int, Path]]:
    """Файлы миграций, отсортированные по номеру версии."""
    directory = Path(migrations_dir)
    if not directory.is_dir():
        return []

    found: list[tuple[int, Path]] = []
    versions: set[int] = set()
    for path in sorted(directory.glob("*.sql")):
        match = MIGRATION_NAME_PATTERN.match(path.name)
        if match is None:
            raise MigrationError(
                f"имя файла миграции должно быть вида 0001_init.sql: {path.name}"
            )
        version = int(match.group(1))
        if version in versions:
            raise MigrationError(f"версия миграции повторяется: {version}")
        versions.add(version)
        found.append((version, path))
    return sorted(found)


def apply_migrations(
    database_path: Path | str,
    migrations_dir: Path | str = MIGRATIONS_DIR,
) -> list[int]:
    """Применяет неприменённые миграции и возвращает список новых версий.

    Каждый файл выполняется один раз и фиксируется в schema_migrations.
    Файлы пишутся идемпотентно и не удаляют существующие данные.
    """
    applied_now: list[int] = []
    connection = connect(database_path)
    try:
        already_applied = applied_versions(connection)
        for version, path in migration_files(migrations_dir):
            if version in already_applied:
                continue
            sql = path.read_text(encoding="utf-8")
            try:
                connection.executescript(sql)
                connection.execute(
                    "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
                    (version, path.stem),
                )
                connection.commit()
            except sqlite3.Error as error:
                connection.rollback()
                raise MigrationError(
                    f"миграция {path.name} не применена: {error}"
                ) from error
            applied_now.append(version)
        return applied_now
    finally:
        connection.close()


def database_is_readable(database_path: Path | str) -> bool:
    """Проверка доступности БД для health-check без изменения данных."""
    connection = None
    try:
        connection = connect(database_path)
        connection.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
    finally:
        if connection is not None:
            connection.close()
