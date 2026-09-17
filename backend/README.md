# Backend

Запускайте backend из корня репозитория. Единственный список прямых
Python-зависимостей находится в корневом `requirements.txt`.

Как запустить локально:

1) Создайте виртуальное окружение и установите зависимости:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

2) Запустите сервер (из корня проекта):

```bash
uvicorn backend.main:app --reload
```

API (для фронтенда):
- `GET /api/quote`, `GET /api/news`, `GET /api/health`
- `GET /api/tests`, `GET /api/test/{id}`, `POST /api/test/submit` (тело: `test_id`, `answers`)
- `GET /api/calendar`, `GET /api/videos`, `GET /api/novel/updates`
- `POST /api/register`, `POST /api/login` (в теле поле `username` — логин **или** email, плюс `password`) → серверная сессия в `HttpOnly` cookie
- `GET /api/user/me`, `POST /api/logout`; для выхода нужен `X-CSRF-Token`, полученный при входе или из `/api/user/me`
- `POST /api/password-reset/request`, `POST /api/password-reset/confirm` — восстановление пароля через одноразовую ссылку

Путь к SQLite можно задать переменной `MOSPHYSICS_DATABASE`; без неё используется
`backend/database.sqlite`. Для HTTPS задайте `SESSION_COOKIE_SECURE=true`.
Письма восстановления требуют переменных `SMTP_*` и `PUBLIC_BASE_URL` из
`backend/.env.example`; токены восстановления не выводятся в ответ или журнал.

Статика: сервер раздаёт файлы из `frontend` в корне проекта.

Подсказка: OpenAPI доступен на `/docs` или `/openapi.json`.
