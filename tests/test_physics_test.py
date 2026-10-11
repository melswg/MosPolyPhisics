import importlib
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.import_physics_test import import_test, QUESTIONS
from backend.models import connect, init_db


@pytest.fixture()
def quiz(tmp_path, monkeypatch):
    database = tmp_path / "quiz.sqlite"
    monkeypatch.setenv("MOSPHYSICS_DATABASE", str(database))
    test_id = import_test(database)
    import backend.main as main
    importlib.reload(main)
    with TestClient(main.app) as client:
        yield client, database, test_id


def test_public_questions_do_not_reveal_answers_and_review_is_server_graded(quiz):
    client, database, test_id = quiz
    catalog = client.get("/api/tests").json()
    assert catalog[0]["question_count"] == 5
    questions = client.get(f"/api/test/{test_id}").json()["questions"]
    assert len(questions) == 5
    assert all(set(question) == {"id", "prompt", "options"} for question in questions)
    answers = {str(question["id"]): definition[5] for question, definition in zip(questions, QUESTIONS)}
    correct = client.post("/api/test/submit", json={"test_id": test_id, "answers": answers}).json()
    assert (correct["correct"], correct["total"], correct["percent"]) == (5, 5, 100)
    assert all(row["is_correct"] and row["explanation"] and row["source"] for row in correct["review"])
    answers[str(questions[0]["id"])] = 0
    wrong = client.post("/api/test/submit", json={"test_id": test_id, "answers": answers}).json()
    assert (wrong["correct"], wrong["percent"]) == (4, 80)
    assert not wrong["review"][0]["is_correct"]
    assert import_test(database) == test_id
    with connect(database) as conn:
        assert conn.execute("SELECT COUNT(*) FROM test_questions").fetchone()[0] == 5


@pytest.mark.parametrize("answers", [{}, {"bad": 0}, {"1": -1}, {"1": 4}, {"1": True}, {"1": 1.5}, {"1": "2"}])
def test_incomplete_or_invalid_answers_are_rejected(quiz, answers):
    client, _, test_id = quiz
    assert client.post("/api/test/submit", json={"test_id": test_id, "answers": answers}).status_code == 422


def test_foreign_question_and_unknown_test(quiz):
    client, _, test_id = quiz
    questions = client.get(f"/api/test/{test_id}").json()["questions"]
    answers = {str(question["id"]): 0 for question in questions}
    answers["99999"] = 1
    assert client.post("/api/test/submit", json={"test_id": test_id, "answers": answers}).status_code == 422
    assert client.get("/api/test/99999").status_code == 404
    assert client.post("/api/test/submit", json={"test_id": 99999, "answers": {}}).status_code == 404


def test_migration_preserves_previous_questions_and_users(tmp_path):
    database = tmp_path / "previous.sqlite"
    assert init_db(database)
    with sqlite3.connect(database) as conn:
        conn.execute("DELETE FROM schema_migrations WHERE version=7")
        conn.execute("ALTER TABLE test_questions DROP COLUMN explanation")
        conn.execute("ALTER TABLE test_questions DROP COLUMN source")
        conn.execute("INSERT INTO users(username,email,password) VALUES ('kept','kept@example.org','kept-hash')")
        conn.execute("INSERT INTO tests(id,title,slug) VALUES (1,'Previous','previous')")
        conn.execute("""INSERT INTO test_questions(test_id,prompt,option_a,option_b,option_c,option_d,correct_index)
            VALUES (1,'Previous question','a','b','c','d',1)""")
    assert init_db(database)
    import_test(database)
    with connect(database) as conn:
        assert conn.execute("SELECT password FROM users WHERE username='kept'").fetchone()[0] == "kept-hash"
        previous = conn.execute("SELECT * FROM test_questions WHERE test_id=1").fetchone()
        assert previous["prompt"] == "Previous question" and previous["correct_index"] == 1
        assert previous["explanation"] == ""


def test_import_never_overwrites_changed_test(quiz):
    _, database, test_id = quiz
    with connect(database) as conn, conn:
        conn.execute("UPDATE test_questions SET prompt='Owner edit' WHERE test_id=? AND sort_order=0", (test_id,))
    with pytest.raises(ValueError, match="no questions were overwritten"):
        import_test(database)
