"""Verified annual physics dates, separate from project events in the database."""

from datetime import date
from typing import Any


PHYSICS_DATES = (
    ("03-14", "День рождения Альберта Эйнштейна", "Альберт Эйнштейн родился 14 марта 1879 года.", "https://www.nobelprize.org/prizes/physics/1921/einstein/biographical/"),
    ("04-14", "Всемирный квантовый день", "Ежегодный день знакомства с квантовой наукой и технологиями.", "https://worldquantumday.org/"),
    ("05-11", "День рождения Ричарда Фейнмана", "Ричард Фейнман родился 11 мая 1918 года.", "https://physicstoday.aip.org/news/richard-feynman-1918-88"),
    ("05-16", "Международный день света", "День ЮНЕСКО, посвящённый роли света в науке и технологиях.", "https://www.un.org/en/observances/international-day-light"),
    ("10-07", "День рождения Нильса Бора", "Нильс Бор родился 7 октября 1885 года.", "https://www.nobelprize.org/prizes/physics/1922/bohr/biographical/"),
    ("10-20", "День рождения Джеймса Чедвика", "Джеймс Чедвик родился 20 октября 1891 года.", "https://www.nobelprize.org/prizes/physics/1935/chadwick/facts/"),
    ("11-07", "День рождения Марии Кюри", "Мария Склодовская-Кюри родилась 7 ноября 1867 года.", "https://www.nobelprize.org/prizes/physics/1903/marie-curie/questions-and-answers/"),
)


def annual_physics_events(year: int) -> list[dict[str, Any]]:
    return [
        {"id": -index, "title": title, "event_date": date.fromisoformat(f"{year:04d}-{day}").isoformat(),
         "description": description, "source": source, "annual": True}
        for index, (day, title, description, source) in enumerate(PHYSICS_DATES, 1)
    ]
