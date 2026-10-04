"""Hourly, atomic news snapshots from a public Google Sheet."""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import io
import json
import logging
import os
from pathlib import Path
import re
import time
from datetime import datetime
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from PIL import Image, ImageOps

from backend.models import connect, get_db_path, init_db

logger = logging.getLogger(__name__)
INTERVAL = 3600
MAX_CSV_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGES = 12
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,150}$")
Image.MAX_IMAGE_PIXELS = 20_000_000


def media_directory() -> Path:
    return Path(os.getenv("MOSPHYSICS_NEWS_MEDIA", "") or get_db_path().parent / "news-media")


def sheet_config() -> tuple[str, str] | None:
    sheet_id = os.getenv("MOSPHYSICS_NEWS_SHEET_ID", "").strip()
    gid = os.getenv("MOSPHYSICS_NEWS_SHEET_GID", "0").strip()
    if not sheet_id:
        return None
    if not ID_PATTERN.fullmatch(sheet_id) or not gid.isdigit():
        raise ValueError("Invalid Google Sheet ID or gid")
    return sheet_id, gid


def google_url_allowed(url: str) -> bool:
    parsed = urlsplit(url)
    host = parsed.hostname or ""
    return (
        parsed.scheme == "https" and parsed.port in (None, 443)
        and not parsed.username and not parsed.password
        and (host in {"docs.google.com", "drive.google.com", "www.googleapis.com", "drive.usercontent.google.com"}
             or host.endswith(".googleusercontent.com"))
    )


class GoogleRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not google_url_allowed(newurl):
            raise ValueError("Download redirect outside Google is not allowed")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url: str, limit: int) -> tuple[bytes, str]:
    if not google_url_allowed(url):
        raise ValueError("Only fixed Google download endpoints are allowed")
    opener = build_opener(GoogleRedirects())
    with opener.open(Request(url, headers={"User-Agent": "MosPolyPhysics-News/1.0"}), timeout=20) as response:
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Download exceeds size limit")
        return data, response.headers.get_content_type()


def source_url(value: str) -> str:
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or parsed.hostname != "t.me"
            or parsed.port not in (None, 443) or parsed.username or parsed.password
            or not re.fullmatch(r"/[A-Za-z0-9_]+/[0-9]+", parsed.path)):
        raise ValueError("source must be a public Telegram post URL")
    return "https://t.me" + parsed.path


def parse_sheet(data: bytes) -> list[dict]:
    if len(data) > MAX_CSV_BYTES:
        raise ValueError("Sheet is too large")
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig")), strict=True)
    headers = reader.fieldnames
    required = {"title", "date", "text", "source", "status", "images"}
    if not headers or len(headers) != len(set(headers)) or not required.issubset(headers):
        raise ValueError("Missing or duplicate sheet columns")
    result = []
    keys = set()
    sources = set()
    for number, raw in enumerate(reader, start=2):
        if number > 1001:
            raise ValueError("Sheet has more than 1000 rows")
        if None in raw or any(value is None for value in raw.values()):
            raise ValueError(f"Row {number}: incomplete CSV record")
        row = {key: value.strip() for key, value in raw.items()}
        if not any(row.values()):
            continue
        if row["status"].casefold() != "готово":
            continue
        if not row["title"] or len(row["title"]) > 200 or not row["text"] or len(row["text"]) > 20000:
            raise ValueError(f"Row {number}: invalid title or text")
        try:
            date = datetime.strptime(row["date"], "%d.%m.%Y").date()
        except ValueError:
            date = datetime.strptime(row["date"], "%Y-%m-%d").date()
        source = source_url(row["source"])
        key = row.get("id") or source
        if len(key) > 300 or key in keys or source in sources:
            raise ValueError(f"Row {number}: duplicate or invalid identity")
        keys.add(key)
        sources.add(source)
        image_links = [] if row["images"] in {"", "-"} else row["images"].split()
        if len(image_links) > MAX_IMAGES:
            raise ValueError(f"Row {number}: too many image links")
        # Validate every link before starting downloads or touching the snapshot.
        for link in image_links:
            drive_reference(link)
        result.append({"row_key": key, "title": row["title"], "content": row["text"],
                       "date": date.isoformat(), "source": source,
                       "category": row.get("category", "")[:200], "image_links": image_links})
    return result


def drive_reference(url: str) -> tuple[str, str]:
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname != "drive.google.com"
            or parsed.port not in (None, 443) or parsed.username or parsed.password):
        raise ValueError("images must contain Google Drive file or folder links")
    match = re.fullmatch(r"/file/d/([A-Za-z0-9_-]+)/view/?", parsed.path)
    if match:
        return "file", match[1]
    match = re.fullmatch(r"/drive/(?:u/[0-9]+/)?folders/([A-Za-z0-9_-]+)/?", parsed.path)
    if match:
        return "folder", match[1]
    file_id = parse_qs(parsed.query).get("id", [""])[0]
    if parsed.path in {"/open", "/uc"} and ID_PATTERN.fullmatch(file_id):
        return "file", file_id
    raise ValueError("Unsupported Google Drive link")


def folder_files(folder_id: str) -> list[str]:
    api_key = os.getenv("GOOGLE_DRIVE_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GOOGLE_DRIVE_API_KEY is required for image folders")
    query = urlencode({"key": api_key, "q": f"'{folder_id}' in parents and trashed = false",
                       "fields": "files(id,mimeType),nextPageToken,incompleteSearch",
                       "pageSize": MAX_IMAGES + 1, "orderBy": "name"})
    data, content_type = download("https://www.googleapis.com/drive/v3/files?" + query, MAX_CSV_BYTES)
    if content_type != "application/json":
        raise ValueError("Invalid Google Drive folder response")
    body = json.loads(data)
    if body.get("incompleteSearch") or body.get("nextPageToken"):
        raise ValueError("Image folder is incomplete or too large")
    files = body.get("files")
    if not isinstance(files, list):
        raise ValueError("Invalid Google Drive file list")
    ids = [item["id"] for item in files if item.get("mimeType") in {"image/jpeg", "image/png", "image/webp"}]
    if not ids or len(ids) > MAX_IMAGES or any(not ID_PATTERN.fullmatch(value) for value in ids):
        raise ValueError("Image folder must contain 1–12 JPEG/PNG/WebP files")
    return ids


def save_image(data: bytes, directory: Path) -> str:
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Image is too large")
    with Image.open(io.BytesIO(data)) as image:
        if image.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Only JPEG/PNG/WebP images are supported")
        if image.width * image.height > Image.MAX_IMAGE_PIXELS:
            raise ValueError("Image dimensions are too large")
        image.load()
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((1600, 1600))
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=88)
    content = output.getvalue()
    name = hashlib.sha256(content).hexdigest() + ".jpg"
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / name
    if not target.exists():
        temporary = directory / (name + ".tmp")
        temporary.write_bytes(content)
        temporary.replace(target)
    return "/news-media/" + name


def prepare_images(rows: list[dict], directory: Path) -> None:
    cache = {}
    deadline = time.monotonic() + 300
    for row in rows:
        ids = []
        for link in row.pop("image_links"):
            if time.monotonic() > deadline:
                raise TimeoutError("Image preparation exceeded five minutes")
            kind, reference = drive_reference(link)
            ids.extend(folder_files(reference) if kind == "folder" else [reference])
        ids = list(dict.fromkeys(ids))
        if len(ids) > MAX_IMAGES:
            raise ValueError("A publication has more than 12 images")
        row["images"] = []
        for file_id in ids:
            if time.monotonic() > deadline:
                raise TimeoutError("Image preparation exceeded five minutes")
            if file_id not in cache:
                # Drive returns an image preview for both photos and videos.
                query = urlencode({"id": file_id, "sz": "w1600"})
                data, _ = download("https://drive.google.com/thumbnail?" + query, MAX_IMAGE_BYTES)
                cache[file_id] = save_image(data, directory)
            row["images"].append(cache[file_id])


def apply_snapshot(rows: list[dict], sheet_key: str, database: Path, now: float) -> None:
    with connect(database) as conn:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            keys = set()
            for row in rows:
                keys.add(row["row_key"])
                conn.execute("""
                    INSERT INTO sheet_news (sheet_key,row_key,title,content,date,source,category,images)
                    VALUES (?,?,?,?,?,?,?,?)
                    ON CONFLICT(sheet_key,row_key) DO UPDATE SET
                    title=excluded.title,content=excluded.content,date=excluded.date,
                    source=excluded.source,category=excluded.category,images=excluded.images
                """, (sheet_key, row["row_key"], row["title"], row["content"], row["date"],
                      row["source"], row["category"], json.dumps(row["images"])))
            for record in conn.execute("SELECT id,row_key FROM sheet_news WHERE sheet_key=?", (sheet_key,)).fetchall():
                if record["row_key"] not in keys:
                    conn.execute("DELETE FROM sheet_news WHERE id=?", (record["id"],))
            conn.execute("UPDATE news_sync_state SET last_success=?,error=NULL WHERE sheet_key=?", (now, sheet_key))


def sync_once(database: Path | None = None, now: float | None = None) -> bool:
    config = sheet_config()
    if config is None:
        return False
    database = database or get_db_path()
    now = time.time() if now is None else now
    sheet_id, gid = config
    sheet_key = sheet_id + ":" + gid
    with connect(database) as conn:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            state = conn.execute("SELECT last_attempt FROM news_sync_state WHERE sheet_key=?", (sheet_key,)).fetchone()
            if state and now - state["last_attempt"] < INTERVAL:
                return False
            conn.execute("""INSERT INTO news_sync_state(sheet_key,last_attempt) VALUES (?,?)
                ON CONFLICT(sheet_key) DO UPDATE SET last_attempt=excluded.last_attempt""", (sheet_key, now))
    try:
        url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?" + urlencode({"format": "csv", "gid": gid})
        data, content_type = download(url, MAX_CSV_BYTES)
        if content_type not in {"text/csv", "application/csv", "text/plain", "application/octet-stream"}:
            raise ValueError("Google did not return a CSV sheet")
        rows = parse_sheet(data)
        prepare_images(rows, media_directory())
        apply_snapshot(rows, sheet_key, database, now)
        logger.info("News sync succeeded: %d published rows", len(rows))
        return True
    except Exception as error:
        # HTTP exceptions may include API keys or private download parameters.
        name = type(error).__name__
        logger.warning("News sync failed (%s); previous publications preserved", name)
        with connect(database) as conn:
            with conn:
                conn.execute("UPDATE news_sync_state SET error=? WHERE sheet_key=?", (name, sheet_key))
        return False


async def sync_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(sync_once)
        except Exception as error:
            logger.warning("News sync worker failed (%s)", type(error).__name__)
        delay = INTERVAL
        config = sheet_config()
        if config:
            with connect() as conn:
                state = conn.execute("SELECT last_attempt FROM news_sync_state WHERE sheet_key=?",
                                     (config[0] + ":" + config[1],)).fetchone()
                if state:
                    delay = max(1, state["last_attempt"] + INTERVAL - time.time())
        await asyncio.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync ready news from Google Sheets (at most once an hour)")
    parser.parse_args()
    if sheet_config() is None:
        parser.error("Set MOSPHYSICS_NEWS_SHEET_ID")
    if not init_db():
        raise SystemExit("Database initialization failed")
    succeeded = sync_once()
    if not succeeded:
        config = sheet_config()
        with connect() as conn:
            state = conn.execute("SELECT error FROM news_sync_state WHERE sheet_key=?",
                                 (config[0] + ":" + config[1],)).fetchone()
        if state and state["error"]:
            raise SystemExit("News sync failed; see news_sync_state and service log")


if __name__ == "__main__":
    main()
