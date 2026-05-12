from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

from backend.models import init_db, get_random_quote, get_all_news, create_user, verify_user


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# модель для данных пользователя (чтобы FastAPI понимал формат JSON)
class UserAuth(BaseModel):
    username: str
    email: str
    password: str

@app.on_event("startup")
def startup():
    init_db()

# эндпоинты

@app.get("/api/quote")
def get_quote():
    return {"quote": get_random_quote()}

@app.get("/api/news")
def get_news():
    return get_all_news()


@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/register")
def register(user: UserAuth):
    success = create_user(user.username, user.email, user.password)
    if not success:
        raise HTTPException(status_code=400, detail="Ошибка регистрации (возможно, пользователь уже существует)")
    return {"status": "success", "message": "Пользователь создан"}

@app.post("/api/login")
def login(user: UserAuth):
    # Поддерживаем вход по username или email
    if verify_user(user.username, user.password) or verify_user(user.email, user.password):
        return {"status": "success", "message": "Вход выполнен"}
    raise HTTPException(status_code=401, detail="Неверные данные")

# Статика (фронтенд)
frontend_dir = Path(__file__).parent.parent.joinpath("frontend").resolve()
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")