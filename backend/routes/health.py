"""Публичный health-check.

Контракт совместимости из API_COMPATIBILITY.md: GET /api/health возвращает
{"status": "ok"}. Поля database и schema_version добавлены и не заменяют status.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..config import get_settings
from ..db import connect, database_is_readable, schema_version

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health() -> dict[str, object]:
    settings = get_settings()
    if not database_is_readable(settings.database_path):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="База данных недоступна",
        )

    connection = connect(settings.database_path)
    try:
        version = schema_version(connection)
    finally:
        connection.close()

    return {"status": "ok", "database": "ok", "schema_version": version}
