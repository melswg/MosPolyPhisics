"""Explicit, repeatable import of five reviewed team questions; never runs at startup."""

import argparse
from pathlib import Path

from backend.models import connect, init_db

SLUG = "physics-basics-2026"
TITLE = "Основы физики: пять вопросов"
DESCRIPTION = "Сила, энергия, вращение и законы механики. После отправки — разбор каждого ответа."
SOURCE_BASE = "https://openstax.org/books/college-physics-2e/pages/"
QUESTIONS = [
    ("Какова единица измерения силы в Международной системе единиц (СИ)?",
     "Вольт", "Джоуль", "Ньютон", "Ватт", 2,
     "Сила измеряется в ньютонах: 1 Н = 1 кг·м/с². Джоуль измеряет энергию, ватт — мощность, вольт — напряжение.",
     SOURCE_BASE + "4-3-newtons-second-law-of-motion-concept-of-a-system"),
    ("Что такое кинетическая энергия?",
     "Энергия, связанная с положением тела в поле сил", "Энергия, связанная с движением тела",
     "Энергия, связанная с деформацией тела", "Энергия, связанная с нагреванием тела", 1,
     "Кинетическая энергия связана с движением. Для тела в поступательном движении при нерелятивистской скорости E = mv²/2. Энергия положения и упругой деформации — потенциальная.",
     SOURCE_BASE + "7-2-kinetic-energy-and-the-work-energy-theorem"),
    ("Что из перечисленного является примером вращательного движения?",
     "Движение автомобиля по прямой дороге", "Движение стрелки часов",
     "Движение шарика, брошенного вверх", "Движение капли дождя", 1,
     "Стрелка часов вращается вокруг неподвижной оси крепления. Её точки вне оси описывают окружности. Перемещение тела по прямой — поступательное движение.",
     SOURCE_BASE + "6-1-rotation-angle-and-angular-velocity"),
    ("Какой закон описывает силы взаимодействия двух тел?",
     "Первый закон Ньютона", "Второй закон Ньютона", "Третий закон Ньютона", "Закон всемирного тяготения", 2,
     "По третьему закону Ньютона силы взаимодействия равны по модулю и противоположны по направлению. Они приложены к разным телам, поэтому не уравновешивают друг друга на одном теле.",
     SOURCE_BASE + "4-4-newtons-third-law-of-motion-symmetry-in-forces"),
    ("Какую силу описывает закон Архимеда для тела, погружённого в покоящуюся жидкость или газ?",
     "Силу трения", "Силу тяжести", "Выталкивающую силу среды", "Силу упругости", 2,
     "Выталкивающая сила равна весу вытесненной среды: F = ρgV. Здесь ρ — плотность среды, V — объём погружённой части тела. В однородном поле тяжести сила направлена вверх.",
     SOURCE_BASE + "11-7-archimedes-principle"),
]


def import_test(database: Path) -> int:
    if not init_db(database):
        raise RuntimeError("Database initialization failed")
    with connect(database) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute("SELECT id FROM tests WHERE slug=?", (SLUG,)).fetchone()
        if existing:
            rows = conn.execute("""SELECT prompt,option_a,option_b,option_c,option_d,
                correct_index,explanation,source FROM test_questions WHERE test_id=?
                ORDER BY sort_order,id""", (existing["id"],)).fetchall()
            if [tuple(row) for row in rows] != QUESTIONS:
                raise ValueError("Existing test differs; no questions were overwritten")
            return existing["id"]
        cursor = conn.execute("INSERT INTO tests(title,description,slug) VALUES (?,?,?)",
                              (TITLE, DESCRIPTION, SLUG))
        test_id = cursor.lastrowid
        conn.executemany("""INSERT INTO test_questions(test_id,sort_order,prompt,option_a,
            option_b,option_c,option_d,correct_index,explanation,source)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
                         [(test_id, order, *question) for order, question in enumerate(QUESTIONS)])
        return test_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Import the reviewed five-question physics test")
    parser.add_argument("database", type=Path, help="Explicit SQLite target; existing data are preserved")
    args = parser.parse_args()
    print(f"Physics test ready: id={import_test(args.database)}")


if __name__ == "__main__":
    main()
