"""Общие фикстуры тестов. Все тесты работают на временной БД."""

from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import reset_settings_cache  # noqa: E402
from backend.main import create_app  # noqa: E402


@pytest.fixture
def temp_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Подменяет БД на временный файл вне репозитория."""
    database_path = tmp_path / "test.sqlite"
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(database_path))
    reset_settings_cache()
    yield database_path
    reset_settings_cache()


@pytest.fixture
def client(temp_database: Path) -> Iterator[TestClient]:
    """Клиент приложения с изолированной конфигурацией."""
    with TestClient(create_app()) as test_client:
        yield test_client