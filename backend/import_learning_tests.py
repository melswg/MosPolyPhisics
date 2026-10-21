"""Explicit import of reviewed learning sets. Never runs on application startup."""

import argparse
from pathlib import Path

from backend.import_physics_test import DESCRIPTION, QUESTIONS, SLUG, SOURCE_BASE, TITLE
from backend.models import connect, init_db

TESTS = [
    (SLUG, TITLE, DESCRIPTION, QUESTIONS),
    ("physics-light-and-electricity", "Свет, электричество и волны",
     "Пять вопросов о свете, звуке и электрическом токе с объяснениями.", [
        ("Какое явление является механической волной?", "Радиоволна", "Звук в воздухе", "Рентгеновское излучение", "Видимый свет", 1,
         "Звук — колебания среды. В вакууме он не распространяется; остальные варианты — электромагнитные волны.", SOURCE_BASE + "17-1-sound"),
        ("Что происходит с лучом при наклонном переходе из воздуха в стекло, если скорость света меняется?",
         "Только поглощение", "Преломление", "Радиоактивный распад", "Электролиз", 1,
         "На границе сред луч преломляется. При переходе в стекло с большим показателем преломления угол к нормали уменьшается.", SOURCE_BASE + "25-3-the-law-of-refraction"),
        ("Какие частицы переносят электрический заряд в металлическом проводнике?",
         "Свободные электроны", "Только протоны", "Только нейтроны", "Фотоны", 0,
         "В металле заряд переносят свободные электроны. Положительные ионы образуют кристаллическую решётку.", SOURCE_BASE + "20-1-current"),
        ("Когда магнитная сила на движущийся заряд в однородном поле максимальна при неизменных |q|, v и B?",
         "Скорость параллельна полю", "Скорость противоположна полю", "Скорость перпендикулярна полю", "Угол не имеет значения", 2,
         "F = |q|vB sin α. При α = 90° синус равен единице, а при движении вдоль поля сила равна нулю.", SOURCE_BASE + "22-4-magnetic-field-strength-force-on-a-moving-charge-in-a-magnetic-field"),
        ("Почему белый свет в призме разделяется на цвета?",
         "Призма создаёт новые цвета", "Показатель преломления зависит от длины волны", "Все цвета отражаются под одним углом", "Свет превращается в звук", 1,
         "Дисперсия — зависимость показателя преломления от длины волны. Разные составляющие белого света отклоняются по-разному.", SOURCE_BASE + "25-5-dispersion-the-rainbow-and-prisms"),
     ]),
    ("fun-everyday-physics", "Физика вокруг нас",
     "Пять бытовых ситуаций: мяч, лёд, радуга, звук и ремень безопасности.", [
        ("Автобус резко тормозит. Почему пассажир наклоняется вперёд?",
         "Инерция: тело сохраняет скорость", "Сила тяжести исчезает", "Воздух толкает вперёд", "Масса пассажира увеличивается", 0,
         "Автобус замедляется, а тело стремится сохранить прежнюю скорость. Ремень и опора помогают изменить скорость вместе с транспортом.", SOURCE_BASE + "4-2-newtons-first-law-of-motion-inertia"),
        ("Почему коньки легче скользят по льду, чем подошва по сухому асфальту?",
         "На льду нет тяжести", "Сила трения обычно меньше", "Масса конькобежца равна нулю", "Лёд отталкивает по ходу движения", 1,
         "Сопротивление скольжению связано с трением. На льду оно обычно ниже; объяснять скольжение полным отсутствием трения неверно.", SOURCE_BASE + "5-1-friction"),
        ("Что образует обычную радугу после дождя?",
         "Свечение водяного пара", "Только тень облаков", "Преломление, дисперсия и внутреннее отражение света в каплях", "Магнитное поле Земли", 2,
         "Свет преломляется на входе в каплю и выходе из неё, разделяется на цвета и отражается внутри. Наблюдатель видит свет от множества капель.", SOURCE_BASE + "25-5-dispersion-the-rainbow-and-prisms"),
        ("Мяч брошен под углом к горизонту. Какова траектория его центра без сопротивления воздуха в однородном поле тяжести?",
         "Окружность", "Прямая", "Парабола", "Спираль", 2,
         "Горизонтальная скорость постоянна, а вертикальная меняется под действием тяжести. Совместно эти движения дают параболу.", SOURCE_BASE + "3-4-projectile-motion"),
        ("Почему в вакууме нельзя услышать звон обычного будильника?",
         "Звук не распространяется без среды", "Свет мешает звуку", "Звук там слишком быстрый", "Будильник теряет массу", 0,
         "Для звука нужна упругая среда: газ, жидкость или твёрдое тело. Через вакуум механическая звуковая волна не передаётся.", SOURCE_BASE + "17-1-sound"),
     ]),
]


def import_tests(database: Path, definitions: list = TESTS) -> list[int]:
    """Validate all existing sets before inserting; preserve edits, IDs and other data."""
    if not init_db(database):
        raise RuntimeError("Database initialization failed")
    with connect(database) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        existing_ids = {}
        for slug, title, description, questions in definitions:
            existing = conn.execute("SELECT id,title,description FROM tests WHERE slug=?", (slug,)).fetchone()
            if not existing:
                continue
            rows = conn.execute("""SELECT prompt,option_a,option_b,option_c,option_d,
                correct_index,explanation,source FROM test_questions WHERE test_id=?
                ORDER BY sort_order,id""", (existing["id"],)).fetchall()
            if existing["title"] != title or existing["description"] != description or [tuple(row) for row in rows] != questions:
                raise ValueError(f"Existing test {slug} differs; no tests were overwritten")
            existing_ids[slug] = existing["id"]
        ids = []
        for slug, title, description, questions in definitions:
            if slug in existing_ids:
                ids.append(existing_ids[slug])
                continue
            cursor = conn.execute("INSERT INTO tests(title,description,slug) VALUES (?,?,?)", (title, description, slug))
            test_id = cursor.lastrowid
            conn.executemany("""INSERT INTO test_questions(test_id,sort_order,prompt,option_a,
                option_b,option_c,option_d,correct_index,explanation,source) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                [(test_id, order, *question) for order, question in enumerate(questions)])
            ids.append(test_id)
        return ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Import reviewed learning tests without overwriting edits")
    parser.add_argument("database", type=Path)
    args = parser.parse_args()
    print(f"Learning tests ready: ids={import_tests(args.database)}")


if __name__ == "__main__":
    main()
