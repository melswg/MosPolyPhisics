Как запустить (локально):

1) Создайте виртуальное окружение и установите зависимости:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Запустите сервер (из корня проекта):

```bash
uvicorn backend.main:app --reload
```

API (минимальный набор для фронтенда):
- GET /api/quote -> случайная цитата
- GET /api/news -> список новостей
- POST /api/register -> регистрация (json: username,email,password)
- POST /api/login -> вход (json: username,email,password) — поддерживается username или email
- GET /api/health -> базовая проверка работоспособности

Статика: сервер раздаёт файлы из `../frontend` (если фронтенд в корне проекта).

Подсказка: OpenAPI доступен на `/docs` или `/openapi.json`.
