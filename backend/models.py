"""Хелперы БД для бэкенда MosPolyPhisics.

Функции: connect, init_db, get_random_quote, get_all_news, пользователи,
тесты (список, прохождение, проверка ответов), календарь, видео, обновления новеллы.
"""
from pathlib import Path
from datetime import datetime, timezone
import os
import sqlite3
from typing import Union, Optional, Iterator, Dict, Any, List
import logging
import contextlib

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def get_db_path() -> Path:
    """Путь к SQLite. Для Docker: MOSPHYSICS_DATABASE=/data/database.sqlite"""
    override = os.environ.get("MOSPHYSICS_DATABASE", "").strip()
    if override:
        return Path(override)
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
        conn.execute("PRAGMA foreign_keys = ON")
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

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cur.execute("SELECT 1 FROM schema_migrations WHERE version = 1")
            if not cur.fetchone():
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token_hash TEXT NOT NULL UNIQUE,
                        csrf_token TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token_hash TEXT NOT NULL UNIQUE,
                        expires_at TEXT NOT NULL,
                        used_at TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                    """
                )
                cur.execute("INSERT INTO schema_migrations (version) VALUES (1)")

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    slug TEXT UNIQUE
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS test_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    test_id INTEGER NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    prompt TEXT NOT NULL,
                    option_a TEXT NOT NULL,
                    option_b TEXT NOT NULL,
                    option_c TEXT NOT NULL,
                    option_d TEXT NOT NULL,
                    correct_index INTEGER NOT NULL,
                    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    event_date TEXT NOT NULL,
                    description TEXT
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL
                )
                """
            )

            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS novel_updates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    body TEXT,
                    update_date TEXT NOT NULL
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

            cur.execute("SELECT COUNT(*) as cnt FROM tests")
            if cur.fetchone()["cnt"] == 0:
                cur.execute(
                    "INSERT INTO tests (title, description, slug) VALUES (?, ?, ?)",
                    ("Тест по физике", "Базовые вопросы по механике и термодинамике", "physics"),
                )
                tid1 = cur.lastrowid
                cur.execute(
                    "INSERT INTO tests (title, description, slug) VALUES (?, ?, ?)",
                    ("Разминка для мозга", "Короткий тест на логику и внимательность", "logic"),
                )
                tid2 = cur.lastrowid
                q1 = [
                    (tid1, 0, "Скорость света в вакууме (приближённо)?", "3·10⁸ м/с", "3·10⁶ м/с", "3·10¹⁰ м/с", "330 м/с", 0),
                    (tid1, 1, "Единица силы в СИ?", "Ньютон", "Джоуль", "Паскаль", "Ватт", 0),
                    (tid1, 2, "Закон всемирного тяготения сформулировал?", "Ньютон", "Эйнштейн", "Галилей", "Кеплер", 0),
                ]
                cur.executemany(
                    """INSERT INTO test_questions
                    (test_id, sort_order, prompt, option_a, option_b, option_c, option_d, correct_index)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    q1,
                )
                q2 = [
                    (tid2, 0, "2 + 2 × 2 = ?", "6", "8", "4", "10", 0),
                    (tid2, 1, "Сколько секунд в одном часе?", "3600", "60", "1000", "600", 0),
                ]
                cur.executemany(
                    """INSERT INTO test_questions
                    (test_id, sort_order, prompt, option_a, option_b, option_c, option_d, correct_index)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    q2,
                )

            cur.execute("SELECT COUNT(*) as cnt FROM calendar_events")
            if cur.fetchone()["cnt"] == 0:
                demo_cal = [
                    ("День космонавтики", "2026-04-12", "Тематический стрим и викторина."),
                    ("Выпуск нового видео", "2026-05-20", "Разбор задач по оптике."),
                ]
                cur.executemany(
                    "INSERT INTO calendar_events (title, event_date, description) VALUES (?, ?, ?)",
                    demo_cal,
                )

            cur.execute("SELECT COUNT(*) as cnt FROM videos")
            if cur.fetchone()["cnt"] == 0:
                demo_vid = [
                    ("Демо: введение в проект", "https://www.youtube.com/embed/dQw4w9WgXcQ"),
                ]
                cur.executemany("INSERT INTO videos (title, url) VALUES (?, ?)", demo_vid)

            cur.execute("SELECT COUNT(*) as cnt FROM novel_updates")
            if cur.fetchone()["cnt"] == 0:
                demo_novel = [
                    ("Версия 0.1", "Собран первый билд, добавлены фоны главы 1.", "2026-05-01"),
                    ("Арт персонажей", "Обновлены спрайты наставника.", "2026-05-08"),
                ]
                cur.executemany(
                    "INSERT INTO novel_updates (title, body, update_date) VALUES (?, ?, ?)",
                    demo_novel,
                )

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
        logger.info("DB initialized")
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
    identifier = identifier.strip()
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM users WHERE username = ? OR lower(email) = lower(?) LIMIT 1",
            (identifier, identifier),
        )
        return cur.fetchone()


def _hash_password(password: str) -> str:
    try:
        from passlib.hash import argon2 as hasher
    except Exception:
        from passlib.hash import pbkdf2_sha256 as hasher
    return hasher.hash(password)


def create_user(username: str, email: str, password: str, db_path: Optional[Union[str, Path]] = None) -> bool:
    try:
        username = username.strip()
        email = email.strip().lower()
        hashed = _hash_password(password)

        with connect(db_path) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM users WHERE username = ? OR lower(email) = lower(?) LIMIT 1",
                (username, email),
            )
            if cur.fetchone():
                return False
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


def get_user_public_by_identifier(identifier: str, db_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    row = _get_user_row(identifier, db_path)
    if not row:
        return None
    return {"id": row["id"], "username": row["username"], "email": row["email"]}


def get_user_by_id(user_id: int, db_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def create_session(
    user_id: int,
    token_hash: str,
    csrf_token: str,
    expires_at: str,
    db_path: Optional[Union[str, Path]] = None,
) -> None:
    with connect(db_path) as conn:
        conn.execute(
            "DELETE FROM user_sessions WHERE expires_at <= ?",
            (datetime.now(timezone.utc).isoformat(),),
        )
        conn.execute(
            "INSERT INTO user_sessions (user_id, token_hash, csrf_token, expires_at) VALUES (?, ?, ?, ?)",
            (user_id, token_hash, csrf_token, expires_at),
        )
        conn.commit()


def get_session_user(
    token_hash: str, db_path: Optional[Union[str, Path]] = None
) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    with connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.email, u.created_at, s.csrf_token
            FROM user_sessions AS s
            JOIN users AS u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ?
            LIMIT 1
            """,
            (token_hash, now),
        ).fetchone()
        return dict(row) if row else None


def delete_session(token_hash: str, db_path: Optional[Union[str, Path]] = None) -> None:
    with connect(db_path) as conn:
        conn.execute("DELETE FROM user_sessions WHERE token_hash = ?", (token_hash,))
        conn.commit()


def create_password_reset_token(
    user_id: int,
    token_hash: str,
    expires_at: str,
    db_path: Optional[Union[str, Path]] = None,
) -> None:
    with connect(db_path) as conn:
        conn.execute(
            "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
            (datetime.now(timezone.utc).isoformat(), user_id),
        )
        conn.execute(
            "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
            (user_id, token_hash, expires_at),
        )
        conn.commit()


def reset_password_with_token(
    token_hash: str,
    new_password: str,
    db_path: Optional[Union[str, Path]] = None,
) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    with connect(db_path) as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            """
            SELECT id, user_id FROM password_reset_tokens
            WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
            LIMIT 1
            """,
            (token_hash, now),
        ).fetchone()
        if not row:
            return False
        conn.execute("UPDATE users SET password = ? WHERE id = ?", (_hash_password(new_password), row["user_id"]))
        conn.execute("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?", (now, row["id"]))
        conn.execute("DELETE FROM user_sessions WHERE user_id = ?", (row["user_id"],))
        conn.commit()
        return True


def get_all_tests(db_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, title, description, slug FROM tests ORDER BY id ASC")
        return [dict(r) for r in cur.fetchall()]


def get_test_for_player(test_id: int, db_path: Optional[Union[str, Path]] = None) -> Optional[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, title, description, slug FROM tests WHERE id = ?", (test_id,))
        test_row = cur.fetchone()
        if not test_row:
            return None
        cur.execute(
            "SELECT id, prompt, option_a, option_b, option_c, option_d FROM test_questions "
            "WHERE test_id = ? ORDER BY sort_order ASC, id ASC",
            (test_id,),
        )
        questions = []
        for r in cur.fetchall():
            questions.append(
                {
                    "id": r["id"],
                    "prompt": r["prompt"],
                    "options": [r["option_a"], r["option_b"], r["option_c"], r["option_d"]],
                }
            )
        out = dict(test_row)
        out["questions"] = questions
        return out


def grade_test_submission(
    test_id: int, answers: Dict[int, int], db_path: Optional[Union[str, Path]] = None
) -> Optional[Dict[str, Any]]:
    """answers: question_id -> выбранный индекс варианта (0–3). Возвращает счёт или None, если тест не найден."""
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM tests WHERE id = ?", (test_id,))
        if not cur.fetchone():
            return None
        cur.execute(
            "SELECT id, correct_index FROM test_questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC",
            (test_id,),
        )
        rows = cur.fetchall()
        if not rows:
            return {"correct": 0, "total": 0, "percent": 0}
        correct = 0
        for r in rows:
            qid = r["id"]
            chosen = answers.get(qid)
            if chosen is None:
                continue
            if int(chosen) == int(r["correct_index"]):
                correct += 1
        total = len(rows)
        percent = round(100 * correct / total) if total else 0
        return {"correct": correct, "total": total, "percent": percent}


def get_calendar_events(db_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, event_date, description FROM calendar_events ORDER BY event_date ASC"
        )
        return [dict(r) for r in cur.fetchall()]


def get_all_videos(db_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, title, url FROM videos ORDER BY id ASC")
        return [dict(r) for r in cur.fetchall()]


def get_novel_updates(db_path: Optional[Union[str, Path]] = None) -> List[Dict[str, Any]]:
    with connect(db_path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, body, update_date FROM novel_updates ORDER BY update_date DESC"
        )
        return [dict(r) for r in cur.fetchall()]
