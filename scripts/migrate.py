#!/usr/bin/env python3
"""Явное применение миграций схемы.

Примеры:
    ./.venv/bin/python scripts/migrate.py
    ./.venv/bin/python scripts/migrate.py --database /tmp/test.sqlite
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import get_settings  # noqa: E402
from backend.db import MigrationError, apply_migrations, connect, schema_version  # noqa: E402


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Применить миграции МосПолиФизикс")
    parser.add_argument(
        "--database",
        default=None,
        help="Путь к SQLite-файлу (по умолчанию MOSPHYSICS_DATABASE или data/mosphysics.sqlite)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    database_path = Path(args.database) if args.database else get_settings().database_path

    try:
        applied = apply_migrations(database_path)
    except MigrationError as error:
        print(f"Ошибка миграции: {error}", file=sys.stderr)
        return 1

    connection = connect(database_path)
    try:
        version = schema_version(connection)
    finally:
        connection.close()

    if applied:
        print(f"Применено миграций: {', '.join(str(item) for item in applied)}")
    else:
        print("Новых миграций нет")
    print(f"База данных: {database_path}")
    print(f"Версия схемы: {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
