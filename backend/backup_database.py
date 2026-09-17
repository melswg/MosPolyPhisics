"""Безопасная онлайн-копия SQLite с проверкой целостности и ротацией."""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


def backup_database(source: Path, destination: Path, keep: int) -> Path:
    if not source.is_file():
        raise FileNotFoundError(f"Database not found: {source}")
    destination.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = destination / f"mosphysics-{stamp}.sqlite"

    with sqlite3.connect(source) as source_db, sqlite3.connect(target) as target_db:
        source_db.backup(target_db)
        result = target_db.execute("PRAGMA integrity_check").fetchone()
        if not result or result[0] != "ok":
            target.unlink(missing_ok=True)
            raise RuntimeError("Backup integrity check failed")
    target.chmod(0o600)

    backups = sorted(destination.glob("mosphysics-*.sqlite"), reverse=True)
    for old_backup in backups[max(keep, 1) :]:
        old_backup.unlink()
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--keep", type=int, default=14)
    args = parser.parse_args()
    print(backup_database(args.source, args.destination, args.keep))


if __name__ == "__main__":
    main()
