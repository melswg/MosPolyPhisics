"""Явно загружает подтверждённую новость этапа 2 в выбранную SQLite-БД."""

from __future__ import annotations

import argparse
from pathlib import Path
import sqlite3

from backend.models import init_db


NEWS = (
    "МосПолиФизикс обновил план развития",
    "Команда определила ближайшую цель проекта: подготовить наполненные главную страницу, раздел «О нас» и новости для демонстрации куратору. После этого работа продолжится над простым управлением публикациями и одним законченным тестом по физике. Технологическая основа проекта остаётся прежней: FastAPI, SQLite и интерфейс на HTML, CSS и JavaScript.",
    "2026-09-14",
)


def import_news(database: Path) -> bool:
    """Добавляет новость один раз; существующие строки не изменяет."""
    init_db(database)
    with sqlite3.connect(database) as connection:
        existing = connection.execute(
            "SELECT 1 FROM news WHERE title = ? AND content = ? AND date = ? LIMIT 1",
            NEWS,
        ).fetchone()
        if existing:
            return False
        connection.execute(
            "INSERT INTO news (title, content, date) VALUES (?, ?, ?)",
            NEWS,
        )
        connection.commit()
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Импорт подтверждённой новости этапа 2 без замены существующих данных."
    )
    parser.add_argument("database", type=Path, help="Путь к отдельной локальной SQLite-БД")
    args = parser.parse_args()
    created = import_news(args.database.resolve())
    print("Новость добавлена." if created else "Новость уже есть; данные не изменены.")


if __name__ == "__main__":
    main()
