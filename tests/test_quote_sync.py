import csv
import importlib
import io
import sqlite3

from fastapi.testclient import TestClient
import pytest

from backend import quote_sync
from backend.models import get_random_sourced_quote, init_db


def sheet(*rows):
    data = io.StringIO()
    writer = csv.writer(data)
    writer.writerow(["quote", "author", "source", "status"])
    writer.writerows(rows)
    return data.getvalue().encode()


@pytest.fixture()
def database(tmp_path, monkeypatch):
    path = tmp_path / "quotes.sqlite"
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(path))
    monkeypatch.setenv("MOSPHYSICS_QUOTES_SHEET_ID", "test")
    monkeypatch.setenv("MOSPHYSICS_QUOTES_SHEET_GID", "123")
    monkeypatch.delenv("MOSPHYSICS_NEWS_SHEET_ID", raising=False)
    assert init_db(path)
    return path


def test_quote_snapshot_updates_removes_and_preserves_other_data(database, monkeypatch):
    with sqlite3.connect(database) as conn:
        conn.execute("INSERT INTO quotes(text,author) VALUES ('Legacy','Author')")
        conn.execute("INSERT INTO news(title,content,date) VALUES ('Local','Keep','2026-10-01')")
    data = sheet(["First", "Author", "https://example.org/first", "готово"],
                 ["Draft", "Other", "https://example.org/draft", "собрано"])
    monkeypatch.setattr(quote_sync, "download", lambda *_: (data, "text/csv"))
    assert quote_sync.sync_once(now=10000)
    assert get_random_sourced_quote(database)["text"] == "First"
    assert not quote_sync.sync_once(now=10001)
    data = sheet(["Changed", "Author", "https://example.org/changed", "готово"])
    assert quote_sync.sync_once(now=13600)
    assert get_random_sourced_quote(database)["text"] == "Changed"
    data = b"<html>No access</html>"
    assert not quote_sync.sync_once(now=17200)
    assert get_random_sourced_quote(database)["text"] == "Changed"
    data = sheet()
    assert quote_sync.sync_once(now=20800)
    assert get_random_sourced_quote(database)["quote"] == ""
    with sqlite3.connect(database) as conn:
        assert conn.execute("SELECT text FROM quotes").fetchone()[0] == "Legacy"
        assert conn.execute("SELECT title FROM news").fetchone()[0] == "Local"


@pytest.mark.parametrize("row", [
    ["", "Author", "https://example.org", "готово"],
    ["Quote", "", "https://example.org", "готово"],
    ["Quote", "Author", "javascript:alert(1)", "готово"],
    ["Quote", "Author", "https://user:password@example.org", "готово"],
])
def test_quote_validation(row):
    with pytest.raises(ValueError):
        quote_sync.parse_sheet(sheet(row))


def test_random_quote_api_has_author_source_and_no_cache(database, monkeypatch):
    rows = [[str(index), "Author", f"https://example.org/{index}", "готово"] for index in range(3)]
    monkeypatch.setattr(quote_sync, "download", lambda *_: (sheet(*rows), "text/csv"))
    assert quote_sync.sync_once(now=10000)
    monkeypatch.delenv("MOSPHYSICS_QUOTES_SHEET_GID")
    import backend.main as main
    importlib.reload(main)
    with TestClient(main.app) as client:
        texts = set()
        for _ in range(80):
            response = client.get("/api/quote")
            assert response.headers["cache-control"] == "no-store"
            quote = response.json()
            texts.add(quote["text"])
            assert quote["author"] == "Author"
            assert quote["source"] == "https://example.org/" + quote["text"]
            assert quote["quote"] == quote["text"] + " — Author"
        assert texts == {"0", "1", "2"}
