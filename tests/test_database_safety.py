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
        assert [row[0] for row in conn.execute("SELECT version FROM schema_migrations ORDER BY version")] == [1, 2, 3, 4, 5]
        assert conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_sessions'"
        ).fetchone()
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
        assert "personal_data_consent_at" in columns
        assert "personal_data_consent_version" in columns
        assert conn.execute(
            "SELECT personal_data_consent_at FROM users WHERE id = 1"
        ).fetchone()[0] is None


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
    assert backup.stat().st_mode & 0o777 == 0o600


def test_auth_migration_accepts_hermes_schema_table(tmp_path):
    database = tmp_path / "hermes.sqlite"
    with sqlite3.connect(database) as conn:
        conn.execute(
            """
            CREATE TABLE schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.commit()

    assert init_db(database)
    with sqlite3.connect(database) as conn:
        migrations = conn.execute(
            "SELECT version, name FROM schema_migrations ORDER BY version"
        ).fetchall()
        assert migrations == [
            (1, "server sessions and password reset"),
            (2, "personal data consent audit"),
            (3, "hourly Google Sheets news sync"),
            (4, "news sections"),
            (5, "sourced quotes from Google Sheets"),
        ]
