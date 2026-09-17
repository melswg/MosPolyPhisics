import sqlite3

from backend.backup_database import backup_database
from backend.models import init_db


def test_auth_migration_preserves_existing_user(tmp_path):
    database = tmp_path / "legacy.sqlite"
    with sqlite3.connect(database) as conn:
        conn.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            ("existing", "existing@example.org", "existing-hash"),
        )
        conn.commit()

    assert init_db(database)
    with sqlite3.connect(database) as conn:
        assert conn.execute("SELECT username FROM users WHERE id = 1").fetchone()[0] == "existing"
        assert conn.execute("SELECT version FROM schema_migrations").fetchone()[0] == 1
        assert conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_sessions'"
        ).fetchone()


def test_backup_is_valid_and_rotated(tmp_path):
    database = tmp_path / "source.sqlite"
    with sqlite3.connect(database) as conn:
        conn.execute("CREATE TABLE sample (value TEXT NOT NULL)")
        conn.execute("INSERT INTO sample (value) VALUES ('kept')")
        conn.commit()

    backup = backup_database(database, tmp_path / "backups", keep=1)
    with sqlite3.connect(backup) as conn:
        assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert conn.execute("SELECT value FROM sample").fetchone()[0] == "kept"
