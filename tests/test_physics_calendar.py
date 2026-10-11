import importlib

from fastapi.testclient import TestClient

from backend.models import connect


def test_annual_dates_follow_requested_year_and_keep_project_events(tmp_path, monkeypatch):
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(tmp_path / "calendar.sqlite"))
    import backend.main as main
    importlib.reload(main)
    with TestClient(main.app) as client:
        with connect() as conn, conn:
            conn.execute("INSERT INTO calendar_events(title,event_date,description) VALUES ('Project','2026-10-12','Keep')")
        first = client.get("/api/calendar?year=2026").json()
        second = client.get("/api/calendar?year=2027").json()
        assert any(row["title"] == "Project" for row in first)
        assert any(row["title"] == "Project" for row in second)
        for rows, year in [(first, 2026), (second, 2027)]:
            dates = [row for row in rows if row.get("annual")]
            assert len(dates) == 7
            assert len({row["id"] for row in dates}) == 7
            assert all(row["event_date"].startswith(str(year)) and row["source"].startswith("https://") for row in dates)
            assert any(row["event_date"] == f"{year}-10-07" and "Бора" in row["title"] for row in dates)
            assert any(row["event_date"] == f"{year}-05-16" and "света" in row["title"] for row in dates)
        assert client.get("/api/calendar?year=0").status_code == 422
