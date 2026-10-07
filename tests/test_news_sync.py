import csv
import io
import sqlite3

from PIL import Image
import pytest

from backend import news_sync
from backend.models import get_all_news, init_db


def sheet(*rows):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["title", "date", "text", "source", "images", "status", "category"])
    for row in rows:
        writer.writerow(row)
    return output.getvalue().encode()


def post(number=1, title="Заголовок", status="готово", images="-"):
    return [title, "04.10.2026", "Подпись\nсо второй строкой", f"https://t.me/physics/{number}", images, status, "Физика"]


@pytest.fixture()
def sync_database(tmp_path, monkeypatch):
    database = tmp_path / "news.sqlite"
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(database))
    monkeypatch.setenv("MOSPHYSICS_NEWS_SHEET_ID", "test-sheet")
    monkeypatch.setenv("MOSPHYSICS_NEWS_SHEET_GID", "0")
    monkeypatch.setenv("MOSPHYSICS_NEWS_MEDIA", str(tmp_path / "media"))
    monkeypatch.delenv("GOOGLE_DRIVE_API_KEY", raising=False)
    assert init_db(database)
    return database


def test_add_update_remove_reorder_and_preserve_local_data(sync_database, monkeypatch):
    with sqlite3.connect(sync_database) as connection:
        connection.execute("INSERT INTO news(title,content,date) VALUES ('Local','Keep','2026-09-01')")
        connection.execute("INSERT INTO users(username,email,password) VALUES ('User','a@example.org','hash')")
    data = sheet(post(1), post(2), post(3, status="Собрано"))
    monkeypatch.setattr(news_sync, "download", lambda *_: (data, "text/csv"))
    assert news_sync.sync_once(now=10000)
    first = {row["source"]: row["id"] for row in get_all_news(sync_database) if "source" in row}
    assert len(first) == 2

    data = sheet(post(2, title="Изменён"), post(1))
    assert news_sync.sync_once(now=13600)
    records = [row for row in get_all_news(sync_database) if "source" in row]
    assert {row["source"]: row["id"] for row in records} == first
    assert next(row for row in records if row["source"].endswith("/2"))["title"] == "Изменён"

    data = sheet(post(2, status="уточнить"), post(4))
    assert news_sync.sync_once(now=17200)
    records = get_all_news(sync_database)
    assert {row.get("source") for row in records} == {None, "https://t.me/physics/4"}
    assert next(row for row in records if row["id"] > 0)["title"] == "Local"
    with sqlite3.connect(sync_database) as connection:
        assert connection.execute("SELECT username FROM users").fetchone()[0] == "User"


def test_hourly_claim_survives_restart_and_errors(sync_database, monkeypatch):
    calls = []

    def fail(*args):
        calls.append(args)
        raise OSError("offline")

    monkeypatch.setattr(news_sync, "download", fail)
    assert not news_sync.sync_once(now=10000)
    assert not news_sync.sync_once(now=10001)
    assert not news_sync.sync_once(now=13599)
    assert len(calls) == 1
    assert not news_sync.sync_once(now=13600)
    assert len(calls) == 2


@pytest.mark.parametrize("broken", [
    b"<html>Login required</html>",
    b"title,date,text,source,images,status\nTruncated",
    sheet(post(1), post(1, title="Duplicate")),
    sheet(["Title", "31.02.2026", "Text", "https://t.me/physics/2", "-", "готово", ""]),
    sheet(post(2, images="http://127.0.0.1/private")),
])
def test_invalid_or_inaccessible_sheet_preserves_snapshot(sync_database, monkeypatch, broken):
    data = sheet(post())
    monkeypatch.setattr(news_sync, "download", lambda *_: (data, "text/csv"))
    assert news_sync.sync_once(now=10000)
    before = get_all_news(sync_database)
    data = broken
    assert not news_sync.sync_once(now=13600)
    assert get_all_news(sync_database) == before


def test_valid_empty_sheet_removes_only_its_own_news(sync_database, monkeypatch):
    data = sheet(post())
    monkeypatch.setattr(news_sync, "download", lambda *_: (data, "text/csv"))
    assert news_sync.sync_once(now=10000)
    data = sheet()
    assert news_sync.sync_once(now=13600)
    assert get_all_news(sync_database) == []


def test_image_failure_does_not_apply_partial_changes(sync_database, monkeypatch):
    data = sheet(post())
    monkeypatch.setattr(news_sync, "download", lambda *_: (data, "text/csv"))
    assert news_sync.sync_once(now=10000)
    before = get_all_news(sync_database)
    data = sheet(post(title="Changed", images="https://drive.google.com/file/d/image1/view"))

    def fetch(url, _limit):
        return (data, "text/csv") if "/export?" in url else (b"<html>No access</html>", "text/html")

    monkeypatch.setattr(news_sync, "download", fetch)
    assert not news_sync.sync_once(now=13600)
    assert get_all_news(sync_database) == before


def test_image_is_reencoded_and_served_locally(sync_database, monkeypatch):
    output = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(output, "PNG")
    data = sheet(post(images="https://drive.google.com/file/d/image1/view"))
    monkeypatch.setattr(news_sync, "download", lambda url, _: (data, "text/csv") if "/export?" in url
                        else (output.getvalue(), "image/png"))
    assert news_sync.sync_once(now=10000)
    url = get_all_news(sync_database)[0]["images"][0]
    target = news_sync.media_directory() / url.rsplit("/", 1)[1]
    with Image.open(target) as image:
        assert image.format == "JPEG"
    import importlib
    import backend.main as main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    # No lifespan here: this test must not start a real network worker.
    client = TestClient(main.app)
    assert client.get(url).headers["content-type"] == "image/jpeg"
    assert client.get("/api/news").json()[0]["images"] == [url]


def test_video_reference_downloads_image_preview(sync_database, monkeypatch):
    preview = io.BytesIO()
    Image.new("RGB", (640, 360), "blue").save(preview, format="JPEG")
    calls = []

    def fetch(url, limit):
        calls.append(url)
        assert url == "https://drive.google.com/thumbnail?id=video1&sz=w1600"
        return preview.getvalue(), "image/jpeg"

    monkeypatch.setattr(news_sync, "download", fetch)
    rows = news_sync.parse_sheet(sheet(post(images="https://drive.google.com/file/d/video1/view")))
    news_sync.prepare_images(rows, news_sync.media_directory())
    assert len(calls) == 1
    assert len(rows[0]["images"]) == 1
    target = news_sync.media_directory() / rows[0]["images"][0].rsplit("/", 1)[1]
    with Image.open(target) as image:
        assert image.format == "JPEG"
        assert image.size == (640, 360)


def test_drive_folder_and_missing_key(sync_database, monkeypatch):
    with pytest.raises(ValueError, match="GOOGLE_DRIVE_API_KEY"):
        news_sync.folder_files("folder1")
    monkeypatch.setenv("GOOGLE_DRIVE_API_KEY", "test-key")
    monkeypatch.setattr(news_sync, "download", lambda *_: (
        b'{"files":[{"id":"image1","mimeType":"image/jpeg"}]}', "application/json"))
    assert news_sync.folder_files("folder1") == ["image1"]


@pytest.mark.parametrize("url", ["http://docs.google.com", "https://drive.google.com.evil.test/x",
                                     "https://127.0.0.1/x", "https://user@docs.google.com/x"])
def test_download_rejects_other_hosts_and_redirects(url):
    assert not news_sync.google_url_allowed(url)
    with pytest.raises(ValueError):
        news_sync.GoogleRedirects().redirect_request(None, None, 302, "", {}, url)


def test_migration_keeps_existing_news(tmp_path):
    database = tmp_path / "old.sqlite"
    with sqlite3.connect(database) as connection:
        connection.execute("CREATE TABLE news(id INTEGER PRIMARY KEY,title TEXT,content TEXT,date TEXT)")
        connection.execute("INSERT INTO news VALUES (7,'Existing','Keep','2026-09-01')")
    assert init_db(database)
    assert get_all_news(database)[0]["title"] == "Existing"
    assert init_db(database)
    assert len(get_all_news(database)) == 1


def test_multiple_workers_claim_only_one_download(sync_database, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    calls = []

    def fetch(*_):
        calls.append(True)
        return sheet(post()), "text/csv"

    monkeypatch.setattr(news_sync, "download", fetch)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(news_sync.sync_once, now=10000) for _ in range(2)]
        assert sorted(future.result() for future in futures) == [False, True]
    assert len(calls) == 1


def test_worker_waits_until_existing_hourly_deadline(sync_database, monkeypatch):
    import asyncio
    with sqlite3.connect(sync_database) as connection:
        connection.execute("INSERT INTO news_sync_state(sheet_key,last_attempt) VALUES ('test-sheet:0',10000)")
    monkeypatch.setattr(news_sync.time, "time", lambda: 11800)
    monkeypatch.setattr(news_sync, "sync_once", lambda: False)
    delays = []

    async def sleep(delay):
        delays.append(delay)
        raise asyncio.CancelledError

    monkeypatch.setattr(news_sync.asyncio, "sleep", sleep)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(news_sync.sync_loop())
    assert delays == [1800]


def test_sections_preserve_rubrics_and_reject_unknown_values(sync_database, monkeypatch):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["title", "date", "text", "source", "images", "status", "category", "section"])
    writer.writerow(post(1) + ["Публикации"])
    writer.writerow(post(2) + ["Анонсы"])
    writer.writerow(post(3) + ["Мемы"])
    data = output.getvalue().encode()
    monkeypatch.setattr(news_sync, "download", lambda *_: (data, "text/csv"))
    assert news_sync.sync_once(now=10000)
    rows = get_all_news(sync_database)
    assert {row["section"] for row in rows} == {"publications", "announcements", "memes"}
    assert all(row["category"] == "Физика" for row in rows)
    data = data.replace("Мемы".encode(), "Неизвестно".encode())
    assert not news_sync.sync_once(now=13600)
    assert get_all_news(sync_database) == rows


def test_news_sections_upgrade_preserves_existing_sheet_rows(tmp_path):
    database = tmp_path / "previous.sqlite"
    assert init_db(database)
    with sqlite3.connect(database) as conn:
        conn.execute("ALTER TABLE sheet_news DROP COLUMN section")
        conn.execute("DELETE FROM schema_migrations WHERE version=4")
        conn.execute("INSERT INTO sheet_news(sheet_key,row_key,title,content,date,source,category) VALUES ('s','r','Existing','Keep','2026-10-01','https://t.me/physics/1','Мемы')")
    assert init_db(database)
    rows = get_all_news(database)
    assert len(rows) == 1
    assert rows[0]["title"] == "Existing"
    assert rows[0]["section"] == "memes"
    assert init_db(database)
    assert get_all_news(database) == rows
