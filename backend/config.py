"""Конфигурация приложения.

Значения читаются только из переменных окружения, секреты в коде не хранятся.
Локальные значения по умолчанию рассчитаны на изолированную БД в каталоге data/
и порт 8011, чтобы экспериментальная версия не пересекалась с production.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
ASSETS_DIR = PROJECT_ROOT / "assets"
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_DATABASE_PATH = DATA_DIR / "mosphysics.sqlite"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8011

_TRUE_VALUES = {"1", "true", "yes", "on"}


def _read_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in _TRUE_VALUES


def _read_origins(name: str) -> tuple[str, ...]:
    raw = os.environ.get(name, "")
    return tuple(item.strip() for item in raw.split(",") if item.strip())


def _read_database_path() -> Path:
    raw = os.environ.get("MOSPHYSICS_DATABASE", "").strip()
    if not raw:
        return DEFAULT_DATABASE_PATH
    candidate = Path(raw).expanduser()
    return candidate if candidate.is_absolute() else PROJECT_ROOT / candidate


@dataclass(frozen=True)
class Settings:
    """Настройки одного процесса приложения."""

    database_path: Path
    host: str
    port: int
    public_base_url: str
    session_cookie_secure: bool
    cors_origins: tuple[str, ...]

    @property
    def cors_enabled(self) -> bool:
        return bool(self.cors_origins)


def load_settings() -> Settings:
    """Собирает настройки из окружения без кэширования."""
    return Settings(
        database_path=_read_database_path(),
        host=os.environ.get("MOSPHYSICS_HOST", DEFAULT_HOST).strip() or DEFAULT_HOST,
        port=int(os.environ.get("MOSPHYSICS_PORT", DEFAULT_PORT)),
        public_base_url=os.environ.get("PUBLIC_BASE_URL", "").strip(),
        session_cookie_secure=_read_flag("SESSION_COOKIE_SECURE"),
        cors_origins=_read_origins("CORS_ORIGINS"),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Настройки текущего процесса."""
    return load_settings()


def reset_settings_cache() -> None:
    """Сбрасывает кэш, нужен тестам и CLI-командам."""
    get_settings.cache_clear()
