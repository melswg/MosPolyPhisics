"""Allowed Simplik parts; clients store choices, never arbitrary image markup."""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class AvatarConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    color: Literal["purple", "blue", "mint", "pink", "gold"] = "purple"
    face: Literal["smile", "wink", "wow", "happy"] = "smile"
    outfit: Literal["none", "labcoat", "hoodie"] = "none"
    accessory: Literal["none", "glasses", "goggles", "headphones"] = "none"
    hat: Literal["none", "graduate", "space"] = "none"


AVATAR_OPTIONS = {
    "color": {"label": "Цвет", "choices": [["purple", "Фиолетовый"], ["blue", "Голубой"], ["mint", "Мятный"], ["pink", "Розовый"], ["gold", "Золотой"]]},
    "face": {"label": "Выражение лица", "choices": [["smile", "Улыбка"], ["wink", "Подмигивание"], ["wow", "Удивление"], ["happy", "Радость"]]},
    "outfit": {"label": "Одежда", "choices": [["none", "Без одежды"], ["labcoat", "Лабораторный халат"], ["hoodie", "Худи с атомом"]]},
    "accessory": {"label": "Аксессуар", "choices": [["none", "Без аксессуара"], ["glasses", "Очки"], ["goggles", "Защитные очки"], ["headphones", "Наушники"]]},
    "hat": {"label": "Головной убор", "choices": [["none", "Без головного убора"], ["graduate", "Академическая шапочка"], ["space", "Шлем космонавта"]]},
}

AVATAR_PRESETS = [
    {"label": "Классический", "config": AvatarConfig().model_dump()},
    {"label": "В лаборатории", "config": AvatarConfig(color="mint", outfit="labcoat", accessory="goggles").model_dump()},
    {"label": "Космонавт", "config": AvatarConfig(color="blue", face="wow", hat="space").model_dump()},
    {"label": "Квантовый студент", "config": AvatarConfig(color="gold", face="wink", outfit="hoodie", hat="graduate").model_dump()},
]
