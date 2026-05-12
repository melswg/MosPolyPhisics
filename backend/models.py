"""Хелперы БД для бэкенда MosPolyPhisics.

Функции:
- менеджер контекста для sqlite-подключений (поддерживает ':memory:')
- init_db с демо-данными
- хелперы: get_random_quote, get_all_news, create_user, verify_user
"""
from pathlib import Path
import sqlite3
from typing import Union, Optional, Iterator, Dict, Any, List
import logging
import contextlib

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def get_db_path() -> Path:
    return Path(__file__).parent / "database.sqlite"


def _normalize_db_path(db_path: Optional[Union[str, Path]]) -> Optional[Path]:
    if db_path is None:
        return get_db_path()
    if isinstance(db_path, Path):
        return db_path
    if db_path in (":memory", ":memory:"):
        return None
    return Path(db_path)


@contextlib.contextmanager
def connect(db_path: Optional[Union[str, Path]] = None) -> Iterator[sqlite3.Connection]:
    normalized = _normalize_db_path(db_path)
    global _shared_memory_conn
    try:
        _shared_memory_conn
    except NameError:
        _shared_memory_conn = None

    if normalized is None:
        # используем общую in-memory БД и держим глобальное соединение открытым,
        # чтобы данные сохранялись между отдельными вызовами connect()
        if _shared_memory_conn is None:
            _shared_memory_conn = sqlite3.connect(
                "file:mospoly_shared?mode=memory&cache=shared",
                uri=True,
                detect_types=sqlite3.PARSE_DECLTYPES,
            )
            _shared_memory_conn.row_factory = sqlite3.Row
        conn = _shared_memory_conn
    else:
        normalized.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(normalized), detect_types=sqlite3.PARSE_DECLTYPES)
    try:
        conn.row_factory = sqlite3.Row
        yield conn
    finally:
        # не закрываем общее in-memory соединение, чтобы сохранить данные между вызовами;
        # закрываем только соединения с файловой БД
        if normalized is not None:
            conn.close()


def init_db(db_path: Optional[Union[str, Path]] = None) -> bool:
    try:
        with connect(db_path) as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA foreign_keys = ON;")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS quotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    author TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS news (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    date TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            # цитаты
            cur.execute("SELECT COUNT(*) as cnt FROM quotes")
            if cur.fetchone()["cnt"] == 0:
                demo_quotes = [
                    ("Физика — это то, что продолжается, даже когда выключают свет.", "Неизвестный физик"),
                    ("Всё следует делать настолько простым, насколько это возможно, но не проще.", "Альберт Эйнштейн"),
                    ("Ядро — это очень маленькая вещь в центре атома.", "Эрнест Резерфорд"),
                    ("Математика — это язык, на котором написана книга природы.", "Галилео Галилей"),
                ]
                cur.executemany("INSERT INTO quotes (text, author) VALUES (?, ?)", demo_quotes)

            # новости
            cur.execute("SELECT COUNT(*) as cnt FROM news")
            if cur.fetchone()["cnt"] == 0:
                demo_news = [
                    ("Запуск проекта", "Сегодня мы запустили прототип МосПолиФизикс!", "2026-05-10"),
                    ("Обновление маскота", "Симплик получил новый дизайн в темной теме.", "2026-05-11"),
                ]
                cur.executemany("INSERT INTO news (title, content, date) VALUES (?, ?, ?)", demo_news)

            # Если база уже существовала без поля created_at — добавим его
            # (ALTER TABLE ADD COLUMN работает в sqlite)
            cur.execute("PRAGMA table_info(news)")
            cols = [r[1] for r in cur.fetchall()]
            if "created_at" not in cols:
                try:
                    cur.execute("ALTER TABLE news ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                    logger.info("Added created_at column to news table")
                except Exception:
                    logger.exception("Failed to add created_at to news")

            conn.commit()
        logger.info("DB initialized and demo data added")
        return True
    except Exception:
        logger.exception("Failed to init DB")
        return False


def get_random_quote(db_path: Optional[Union[str, Path]] = None) -> str:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT text, author FROM quotes ORDER BY RANDOM() LIMIT 1")
        row = cur.fetchone()
        if not row:
            return ""
        author = row["author"] or ""
        return f"{row['text']} — {author}" if author else row['text']


def get_all_news(db_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        # Выбираем колонки в зависимости от наличия created_at (поддержка старых БД)
        cur.execute("PRAGMA table_info(news)")
        cols = [r[1] for r in cur.fetchall()]
        if "created_at" in cols:
            cur.execute("SELECT id, title, content, date, created_at FROM news ORDER BY date DESC")
        else:
            cur.execute("SELECT id, title, content, date FROM news ORDER BY date DESC")
        rows = cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            # гарантируем, что created_at существует и равен None, если он отсутствует
            if "created_at" not in d:
                d["created_at"] = None
            result.append(d)
        return result


def _get_user_row(identifier: str, db_path: Optional[Union[str, Path]] = None) -> Optional[sqlite3.Row]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1", (identifier, identifier))
        return cur.fetchone()


def create_user(username: str, email: str, password: str, db_path: Optional[Union[str, Path]] = None) -> bool:
    try:
        # предпочитаем argon2, в противном случае используем pbkdf2_sha256
        try:
            from passlib.hash import argon2 as _hasher
        except Exception:
            from passlib.hash import pbkdf2_sha256 as _hasher

        # убедимся, что пароль — строка
        if not isinstance(password, (str, bytes)):
            password = str(password)
        # вычисляем хэш
        hashed = _hasher.hash(password)

        with connect(db_path) as conn:
            cur = conn.cursor()
            cur.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", (username, email, hashed))
            conn.commit()
        return True
    except sqlite3.IntegrityError:
        logger.warning("User already exists")
        return False
    except Exception:
        logger.exception("Failed to create user")
        return False


def verify_user(identifier: str, password: str, db_path: Optional[Union[str, Path]] = None) -> bool:
    row = _get_user_row(identifier, db_path)
    if not row:
        return False
    stored = row["password"]
    try:
        # пробуем argon2, затем pbkdf2_sha256, затем bcrypt
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["argon2", "pbkdf2_sha256", "bcrypt"], deprecated="auto")
        return ctx.verify(password, stored)
    except Exception:
        logger.exception("Password verification error")
        return False