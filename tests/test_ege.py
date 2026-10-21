import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(tmp_path / "ege.sqlite"))
    import backend.main as main
    importlib.reload(main)
    with TestClient(main.app) as test_client:
        yield test_client


def test_all_ten_tasks_are_public_and_answers_only_appear_after_submission(client):
    tasks = client.get("/api/ege").json()
    assert len(tasks) == 10
    assert all(set(task) == {"id", "topic", "prompt", "unit"} for task in tasks)
    for task_id, answer in enumerate(["3", "2", "2", "9", "40", "5000", "8400", "6", "4", "50"], 1):
        result = client.post("/api/ege/submit", json={"task_id": task_id, "answer": answer})
        assert result.status_code == 200
        assert result.json()["is_correct"] is True
        assert result.json()["explanation"] and result.json()["source"].startswith("https://")
    assert client.post("/api/ege/submit", json={"task_id": 1, "answer": "4"}).json()["is_correct"] is False


@pytest.mark.parametrize("answer", [" 3,0 ", "3.000", "+3", "003"])
def test_decimal_comma_dot_and_outer_spaces_are_accepted(client, answer):
    assert client.post("/api/ege/submit", json={"task_id": 1, "answer": answer}).json()["is_correct"] is True


@pytest.mark.parametrize("answer", ["", " ", "NaN", "Infinity", "3 м/с", "1/0", "3,0.0", "1e999", "<script>", "3" * 65, True, 3, None])
def test_malformed_answers_are_rejected(client, answer):
    assert client.post("/api/ege/submit", json={"task_id": 1, "answer": answer}).status_code == 422


def test_unknown_task_and_invalid_id(client):
    assert client.post("/api/ege/submit", json={"task_id": 999, "answer": "3"}).status_code == 404
    assert client.post("/api/ege/submit", json={"task_id": True, "answer": "3"}).status_code == 422
