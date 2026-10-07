"""Atomic hourly snapshots of verified quotes, independent of the news feed."""

from __future__ import annotations

import argparse
import asyncio
import csv
import io
import logging
import os
from pathlib import Path
import time
from urllib.parse import urlencode, urlsplit

from backend.models import connect, get_db_path, init_db
from backend.news_sync import download, ID_PATTERN, INTERVAL, MAX_CSV_BYTES

logger = logging.getLogger(__name__)


def sheet_config() -> tuple[str, str] | None:
    sheet_id = (os.getenv("MOSPHYSICS_QUOTES_SHEET_ID") or os.getenv("MOSPHYSICS_NEWS_SHEET_ID", "")).strip()
    gid = os.getenv("MOSPHYSICS_QUOTES_SHEET_GID", "").strip()
    if not sheet_id or not gid:
        return None
    if not ID_PATTERN.fullmatch(sheet_id) or not gid.isdigit():
        raise ValueError("Invalid quote sheet ID or gid")
    return sheet_id, gid


def parse_sheet(data: bytes) -> list[dict[str, str]]:
    if len(data) > MAX_CSV_BYTES:
        raise ValueError("Quote sheet is too large")
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig")), strict=True)
    headers = reader.fieldnames
    if not headers or len(headers) != len(set(headers)) or not {"quote", "author", "source", "status"}.issubset(headers):
        raise ValueError("Missing or duplicate quote columns")
    rows = []
    keys = set()
    for number, raw in enumerate(reader, 2):
        if number > 1001 or None in raw or any(value is None for value in raw.values()):
            raise ValueError("Invalid quote CSV record")
        row = {key: value.strip() for key, value in raw.items()}
        if row["status"].casefold() != "готово":
            continue
        if not row["quote"] or len(row["quote"]) > 2000 or not row["author"] or len(row["author"]) > 200:
            raise ValueError(f"Row {number}: invalid quote or author")
        source = urlsplit(row["source"])
        if (len(row["source"]) > 2000 or source.scheme != "https" or not source.hostname
                or source.username or source.password or source.port not in (None, 443)):
            raise ValueError(f"Row {number}: source must be an HTTPS URL")
        key = row.get("id") or row["author"] + ":" + row["quote"]
        if key in keys:
            raise ValueError(f"Row {number}: duplicate quote")
        keys.add(key)
        rows.append({"row_key": key, "text": row["quote"], "author": row["author"], "source": row["source"]})
    return rows


def sync_once(database: Path | None = None, now: float | None = None) -> bool:
    config = sheet_config()
    if config is None:
        return False
    database = database or get_db_path()
    now = time.time() if now is None else now
    sheet_id, gid = config
    key = f"quotes:{sheet_id}:{gid}"
    with connect(database) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        state = conn.execute("SELECT last_attempt FROM news_sync_state WHERE sheet_key=?", (key,)).fetchone()
        if state and now - state["last_attempt"] < INTERVAL:
            return False
        conn.execute("""INSERT INTO news_sync_state(sheet_key,last_attempt) VALUES (?,?)
            ON CONFLICT(sheet_key) DO UPDATE SET last_attempt=excluded.last_attempt""", (key, now))
    try:
        data, content_type = download(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?" +
                                      urlencode({"format": "csv", "gid": gid}), MAX_CSV_BYTES)
        if content_type not in {"text/csv", "application/csv", "text/plain", "application/octet-stream"}:
            raise ValueError("Google did not return quote CSV")
        rows = parse_sheet(data)
        with connect(database) as conn, conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("DELETE FROM sheet_quotes WHERE sheet_key=?", (key,))
            conn.executemany("INSERT INTO sheet_quotes(sheet_key,row_key,text,author,source) VALUES (?,?,?,?,?)",
                             [(key, row["row_key"], row["text"], row["author"], row["source"]) for row in rows])
            conn.execute("UPDATE news_sync_state SET last_success=?,error=NULL WHERE sheet_key=?", (now, key))
        logger.info("Quote sync succeeded: %d verified rows", len(rows))
        return True
    except Exception as error:
        name = type(error).__name__
        logger.warning("Quote sync failed (%s); previous quotes preserved", name)
        with connect(database) as conn, conn:
            conn.execute("UPDATE news_sync_state SET error=? WHERE sheet_key=?", (name, key))
        return False


async def sync_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(sync_once)
        except Exception as error:
            logger.warning("Quote sync worker failed (%s)", type(error).__name__)
        delay = INTERVAL
        config = sheet_config()
        if config:
            with connect() as conn:
                row = conn.execute("SELECT last_attempt FROM news_sync_state WHERE sheet_key=?",
                                   (f"quotes:{config[0]}:{config[1]}",)).fetchone()
                if row:
                    delay = max(1, row["last_attempt"] + INTERVAL - time.time())
        await asyncio.sleep(delay)


def main() -> None:
    argparse.ArgumentParser(description="Sync verified quotes from Google Sheets").parse_args()
    if sheet_config() is None:
        raise SystemExit("Set MOSPHYSICS_QUOTES_SHEET_GID and a sheet ID")
    if not init_db():
        raise SystemExit("Database initialization failed")
    sync_once()
    config = sheet_config()
    with connect() as conn:
        state = conn.execute("SELECT error FROM news_sync_state WHERE sheet_key=?",
                             (f"quotes:{config[0]}:{config[1]}",)).fetchone()
        if state and state["error"]:
            raise SystemExit("Quote sync failed; previous quotes preserved")


if __name__ == "__main__":
    main()
