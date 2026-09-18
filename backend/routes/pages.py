"""Отдача корневой HTML-страницы.

Статические файлы (CSS, JS, брендовые assets) раздаются монтированием в main.py.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from ..config import FRONTEND_DIR

router = APIRouter(include_in_schema=False)
INDEX_FILE = FRONTEND_DIR / "index.html"


@router.get("/")
def index() -> FileResponse:
    if not INDEX_FILE.is_file():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Корневая страница не найдена",
        )
    return FileResponse(INDEX_FILE, media_type="text/html; charset=utf-8")
