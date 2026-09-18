# Целевая архитектура

## Стек

- Python 3.12;
- FastAPI + Uvicorn;
- SQLite;
- Pydantic;
- Argon2;
- HTML/CSS/vanilla JavaScript;
- pytest;
- Docker и Docker Compose.

## Рекомендуемая структура

```text
backend/
  main.py
  config.py
  db.py
  migrations/
  models/
  repositories/
  services/
  routes/
frontend/
  index.html
  pages/
  css/
  js/
  assets/
tests/
scripts/
deploy/
data/                 # ignored by Git
```

Структуру разрешено упростить на старте, но HTTP, бизнес-логика и работа с БД не
должны смешиваться в одной огромной функции.

## API первой версии

```text
GET  /api/health
GET  /api/quote
GET  /api/news
GET  /api/news/{id}

POST /api/register
POST /api/login
POST /api/logout
GET  /api/user/me
POST /api/password-reset/request
POST /api/password-reset/confirm

GET  /api/tests
GET  /api/tests/{id}
POST /api/tests/{id}/submit

POST /api/admin/news
PUT  /api/admin/news/{id}
```

При расширении добавляются `/api/videos`, `/api/calendar`, `/api/novel` и `/api/ege`.

## Данные

Минимальные сущности:

- `users`: id, username, normalized email, password hash, role, timestamps;
- `sessions`: hashed token, user, CSRF token, expiry, timestamps;
- `password_reset_tokens`: hashed token, user, expiry, used_at;
- `news`: title, content, publication date, timestamps;
- `tests`, `test_questions`, варианты и объяснения;
- `schema_migrations`.

Миграции применяются явно и сохраняют существующие данные. Обычный запуск не
должен автоматически возвращать удалённые демозаписи.

## Авторизация

- Session ID — криптографически случайный непрозрачный токен.
- В БД хранится только SHA-256 токена.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` в HTTPS, ограниченный path.
- Изменяющие запросы проверяют CSRF.
- Выход удаляет серверную сессию и cookie.
- Сброс пароля одноразовый, ограничен по времени и отзывает активные сессии.
- Запрос восстановления всегда отвечает одинаково для существующего и
  неизвестного email.

## Конфигурация

Ожидаемые переменные без реальных значений:

```text
MOSPHYSICS_DATABASE=
PUBLIC_BASE_URL=
SESSION_COOKIE_SECURE=false
CORS_ORIGINS=
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_USE_TLS=true
```

Локально по умолчанию использовать отдельную БД внутри игнорируемого `data/` и
порт 8011. Тесты обязаны переопределять БД на временный файл.

## Ошибки и безопасность

- 400/422 — неверный ввод;
- 401 — нет действующей сессии;
- 403 — нет прав или CSRF;
- 404 — объект не найден;
- 409 — конфликт уникальности;
- 500 — общий безопасный ответ без traceback и внутренних путей.

Публичные строки не вставляются через `innerHTML`. Форматированный текст требует
безопасного renderer. Все SQL-запросы параметризованы.
