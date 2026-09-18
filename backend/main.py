"""Точка входа приложения «МосПолиФизикс» (экспериментальная версия).

Запуск: uvicorn backend.main:app --host 127.0.0.1 --port 8011
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import ASSETS_DIR, FRONTEND_DIR, get_settings
from .routes import health, pages

logger = logging.getLogger("mosphysics")

APP_TITLE = "МосПолиФизикс"
APP_VERSION = "0.1.0"


def create_app() -> FastAPI:
    """Собирает приложение: конфигурация, статика, роуты, безопасные ошибки."""
    settings = get_settings()

    app = FastAPI(
        title=APP_TITLE,
        version=APP_VERSION,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    if settings.cors_enabled:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE"],
            allow_headers=["Content-Type", "X-CSRF-Token"],
        )

    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

    app.include_router(health.router)
    app.include_router(pages.router)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, error: Exception) -> JSONResponse:
        """Общий безопасный ответ без traceback и внутренних путей."""
        logger.exception("Необработанная ошибка на %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Внутренняя ошибка сервера"},
        )

    return app


app = create_app()
