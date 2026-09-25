"""Отдача HTML-страниц сайта.

Статические файлы (CSS, JS, брендовые assets) раздаются монтированием в main.py.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from ..config import FRONTEND_DIR

router = APIRouter(include_in_schema=False)
INDEX_FILE = FRONTEND_DIR / "index.html"
PAGES_DIR = FRONTEND_DIR / "pages"

PAGE_FILES = {
    "/about": "about.html",
    "/news": "news.html",
    "/projects": "projects.html",
    "/video": "video.html",
    "/calendar": "calendar.html",
    "/novel": "novel.html",
    "/tests": "tests.html",
    "/test": "test.html",
    "/ege": "ege.html",
    "/quotes": "quotes.html",
    "/account": "account.html",
    "/login": "login.html",
    "/register": "register.html",
    "/password-reset": "password-reset.html",
    "/password-reset/confirm": "password-reset-confirm.html",
}


def page_response(path: Path) -> FileResponse:
    """Отдаёт страницу или понятную ошибку, если файла нет на диске."""
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Страница не найдена на диске",
        )
    return FileResponse(path, media_type="text/html; charset=utf-8")


def make_page_handler(filename: str) -> Callable[[], FileResponse]:
    """Обработчик одной страницы: без общего кода на все маршруты."""

    def handler() -> FileResponse:
        return page_response(PAGES_DIR / filename)

    return handler


@router.get("/")
def index() -> FileResponse:
    return page_response(INDEX_FILE)


for page_path, page_file in PAGE_FILES.items():
    router.add_api_route(page_path, make_page_handler(page_file), methods=["GET"])
