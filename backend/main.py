import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path

from backend.models import (
    init_db,
    get_random_quote,
    get_all_news,
    create_user,
    verify_user,
    get_user_by_id,
    get_user_public_by_identifier,
    get_all_tests,
    get_test_for_player,
    grade_test_submission,
    get_calendar_events,
    get_all_videos,
    get_novel_updates,
)

JWT_SECRET = os.getenv("JWT_SECRET", "mos-poly-dev-secret-min-32-chars-long!!")
JWT_ALG = "HS256"
JWT_EXPIRE_DAYS = 7

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    """Логин по имени пользователя или email."""

    username: str
    password: str


class TestSubmitBody(BaseModel):
    test_id: int
    answers: Dict[str, int] = Field(default_factory=dict)


def create_access_token(user_id: int, username: str, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    user_id = int(payload["sub"])
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


@app.on_event("startup")
def startup():
    init_db()


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


@app.post("/api/register")
def register(user: UserRegister):
    success = create_user(user.username, user.email, user.password)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Ошибка регистрации (возможно, пользователь уже существует)",
        )
    meta = get_user_public_by_identifier(user.username)
    if not meta:
        return {"status": "success", "message": "Пользователь создан"}
    token = create_access_token(meta["id"], meta["username"], meta["email"])
    return {
        "status": "success",
        "message": "Пользователь создан",
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": meta["id"], "username": meta["username"], "email": meta["email"]},
    }


@app.post("/api/login")
def login(body: UserLogin):
    ident = body.username.strip()
    if verify_user(ident, body.password):
        meta = get_user_public_by_identifier(ident)
        if not meta:
            raise HTTPException(status_code=401, detail="Неверные данные")
        token = create_access_token(meta["id"], meta["username"], meta["email"])
        return {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": meta["id"], "username": meta["username"], "email": meta["email"]},
        }
    raise HTTPException(status_code=401, detail="Неверные данные")


@app.get("/api/user/me")
def user_me(user: Dict[str, Any] = Depends(get_current_user)):
    return user


# Статика (фронтенд) — после API-маршрутов
frontend_dir = Path(__file__).parent.parent.joinpath("frontend").resolve()
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")
