import os
import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from pathlib import Path

from backend.email_service import send_password_reset
from backend.models import (
    init_db,
    get_random_quote,
    get_all_news,
    create_user,
    verify_user,
    get_user_public_by_identifier,
    create_session,
    get_session_user,
    delete_session,
    create_password_reset_token,
    reset_password_with_token,
    get_all_tests,
    get_test_for_player,
    grade_test_submission,
    get_calendar_events,
    get_all_videos,
    get_novel_updates,
)

logger = logging.getLogger(__name__)
SESSION_COOKIE = "mospoly_session"
SESSION_DAYS = 7
RESET_MINUTES = 30
USERNAME_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё0-9_.-]+$")

app = FastAPI()

cors_origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "").split(",") if item.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-CSRF-Token"],
    )


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if not USERNAME_PATTERN.fullmatch(value):
            raise ValueError("Имя может содержать буквы, цифры, точку, дефис и подчёркивание")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Введите корректный адрес электронной почты")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Пароль должен содержать буквы и цифры")
        return value


class UserLogin(BaseModel):
    """Логин по имени пользователя или email."""

    username: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return UserRegister.validate_password(value)


class TestSubmitBody(BaseModel):
    test_id: int
    answers: Dict[str, int] = Field(default_factory=dict)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _set_session(response: Response, user_id: int) -> str:
    token = secrets.token_urlsafe(48)
    csrf_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    create_session(user_id, _token_hash(token), csrf_token, expires.isoformat())
    secure = os.getenv("SESSION_COOKIE_SECURE", "false").lower() in {"1", "true", "yes"}
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    return csrf_token


async def get_current_user(mospoly_session: Optional[str] = Cookie(None)) -> Dict[str, Any]:
    if not mospoly_session:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    user = get_session_user(_token_hash(mospoly_session))
    if not user:
        raise HTTPException(status_code=401, detail="Сессия истекла или недействительна")
    return user


@app.on_event("startup")
def startup():
    if not init_db():
        raise RuntimeError("Database initialization failed")


@app.get("/api/quote")
def get_quote():
    return {"quote": get_random_quote()}


@app.get("/api/news")
def get_news():
    return get_all_news()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/tests")
def api_tests():
    return get_all_tests()


@app.get("/api/test/{test_id}")
def api_test_detail(test_id: int):
    data = get_test_for_player(test_id)
    if not data:
        raise HTTPException(status_code=404, detail="Тест не найден")
    return data


@app.post("/api/test/submit")
def api_test_submit(body: TestSubmitBody):
    raw = body.answers or {}
    answers: Dict[int, int] = {}
    for k, v in raw.items():
        try:
            answers[int(k)] = int(v)
        except (TypeError, ValueError):
            continue
    result = grade_test_submission(body.test_id, answers)
    if result is None:
        raise HTTPException(status_code=404, detail="Тест не найден")
    return result


@app.get("/api/calendar")
def api_calendar():
    return get_calendar_events()


@app.get("/api/videos")
def api_videos():
    return get_all_videos()


@app.get("/api/novel/updates")
def api_novel_updates():
    return get_novel_updates()


@app.post("/api/register", status_code=201)
def register(user: UserRegister, response: Response):
    success = create_user(user.username, user.email, user.password)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Ошибка регистрации (возможно, пользователь уже существует)",
        )
    meta = get_user_public_by_identifier(user.username)
    if not meta:
        return {"status": "success", "message": "Пользователь создан"}
    csrf_token = _set_session(response, meta["id"])
    return {
        "status": "success",
        "message": "Пользователь создан",
        "csrf_token": csrf_token,
        "user": {"id": meta["id"], "username": meta["username"], "email": meta["email"]},
    }


@app.post("/api/login")
def login(body: UserLogin, response: Response):
    ident = body.username.strip()
    if verify_user(ident, body.password):
        meta = get_user_public_by_identifier(ident)
        if not meta:
            raise HTTPException(status_code=401, detail="Неверные данные")
        csrf_token = _set_session(response, meta["id"])
        return {
            "status": "success",
            "csrf_token": csrf_token,
            "user": {"id": meta["id"], "username": meta["username"], "email": meta["email"]},
        }
    raise HTTPException(status_code=401, detail="Неверные данные")


@app.get("/api/user/me")
def user_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"],
        "csrf_token": user["csrf_token"],
    }


@app.post("/api/logout", status_code=204)
def logout(
    response: Response,
    user: Dict[str, Any] = Depends(get_current_user),
    mospoly_session: Optional[str] = Cookie(None),
    x_csrf_token: Optional[str] = Header(None),
):
    if not x_csrf_token or not secrets.compare_digest(x_csrf_token, user["csrf_token"]):
        raise HTTPException(status_code=403, detail="Проверка запроса не пройдена")
    if mospoly_session:
        delete_session(_token_hash(mospoly_session))
    response.delete_cookie(SESSION_COOKIE, path="/")


@app.post("/api/password-reset/request")
def request_password_reset(body: PasswordResetRequest, request: Request):
    meta = get_user_public_by_identifier(body.email.strip().lower())
    if meta:
        token = secrets.token_urlsafe(48)
        expires = datetime.now(timezone.utc) + timedelta(minutes=RESET_MINUTES)
        create_password_reset_token(meta["id"], _token_hash(token), expires.isoformat())
        public_base = os.getenv("PUBLIC_BASE_URL", str(request.base_url).rstrip("/")).rstrip("/")
        reset_url = f"{public_base}/pages/reset_password.html?token={token}"
        try:
            sent = send_password_reset(meta["email"], reset_url)
            if not sent:
                logger.warning("SMTP is not configured; password reset email was not sent")
        except Exception:
            logger.exception("Password reset email delivery failed")
    return {"message": "Если адрес зарегистрирован, на него отправлена ссылка для восстановления"}


@app.post("/api/password-reset/confirm")
def confirm_password_reset(body: PasswordResetConfirm):
    if not reset_password_with_token(_token_hash(body.token), body.new_password):
        raise HTTPException(status_code=400, detail="Ссылка недействительна или срок её действия истёк")
    return {"message": "Пароль изменён. Войдите с новым паролем"}


# Статика (фронтенд) — после API-маршрутов
frontend_dir = Path(__file__).parent.parent.joinpath("frontend").resolve()
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")
