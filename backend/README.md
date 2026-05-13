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

API (для фронтенда):
- `GET /api/quote`, `GET /api/news`, `GET /api/health`
- `GET /api/tests`, `GET /api/test/{id}`, `POST /api/test/submit` (тело: `test_id`, `answers`)
- `GET /api/calendar`, `GET /api/videos`, `GET /api/novel/updates`
- `POST /api/register`, `POST /api/login` (в теле поле `username` — логин **или** email, плюс `password`) → JWT `access_token`
- `GET /api/user/me` — заголовок `Authorization: Bearer <token>`

Переменная окружения `JWT_SECRET` (см. `backend/.env.example`).

Статика: сервер раздаёт файлы из `../frontend` (если фронтенд в корне проекта).

Подсказка: OpenAPI доступен на `/docs` или `/openapi.json`.
