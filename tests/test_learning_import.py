import pytest

from backend.import_learning_tests import TESTS, import_tests
from backend.models import connect, get_all_tests, get_test_for_player, grade_test_submission


def test_import_is_repeatable_and_all_sets_can_be_completed(tmp_path):
    database = tmp_path / "learning.sqlite"
    ids = import_tests(database)
    assert import_tests(database) == ids
    assert len(get_all_tests(database)) == len(TESTS)
    for test_id, (_, _, _, definitions) in zip(ids, TESTS):
        test = get_test_for_player(test_id, database)
        assert len(test["questions"]) == 5
        assert all(set(q) == {"id", "prompt", "options"} for q in test["questions"])
        answers = {q["id"]: definition[5] for q, definition in zip(test["questions"], definitions)}
        review = grade_test_submission(test_id, answers, database)
        assert review["percent"] == 100
        assert all(row["source"].startswith("https://") and row["explanation"] for row in review["review"])
        for question in definitions:
            assert len(set(question[1:5])) == 4


def test_conflicting_import_is_atomic_and_preserves_other_data(tmp_path):
    database = tmp_path / "learning.sqlite"
    ids = import_tests(database)
    with connect(database) as conn, conn:
        conn.execute("UPDATE tests SET title='Owner title' WHERE id=?", (ids[-1],))
        conn.execute("INSERT INTO users(username,email,password) VALUES ('kept','kept@example.org','hash')")
    new_set = ("new-set", "New", "New", TESTS[0][3])
    with pytest.raises(ValueError, match="no tests were overwritten"):
        import_tests(database, [new_set, *TESTS])
    with connect(database) as conn:
        assert conn.execute("SELECT id FROM tests WHERE slug='new-set'").fetchone() is None
        assert conn.execute("SELECT title FROM tests WHERE id=?", (ids[-1],)).fetchone()[0] == "Owner title"
        assert conn.execute("SELECT password FROM users WHERE username='kept'").fetchone()[0] == "hash"
