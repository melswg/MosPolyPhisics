# Проект «МосПолиФизикс»

## 1. Описание
Образовательный веб-ресурс для университетского проекта «МосПолиФизикс». Платформа для размещения образовательного контента по физике (тесты, новости, видео, визуальная новелла, цитаты).

## 2. Цели (MVP)
*   **Основная цель:** Создание работающего прототипа к аттестации.
*   **Функционал MVP:**
    *   Отображение контента (цитаты, новости).
    *   Навигация по разделам сайта.
    *   Система регистрации пользователей (базовая).
    *   Интеграция фронтенда с API бэкенда.

## 3. Технологический стек
*   **Backend:** Python (FastAPI).
*   **Database:** SQLite3.
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (без сложных фреймворков для MVP).

## 4. Архитектура
*   `/backend/` — FastAPI сервер, модели БД, логика.
*   `/frontend/` — статические файлы (HTML, CSS, JS).
*   Взаимодействие: Фронтенд делает `fetch()` запросы к эндпоинтам `/api/...`.

## 5. API Контракт (эндпоинты)

**Публичные**

* `GET /api/health` — `{ "status": "ok" }`.
* `GET /api/quote` — `{ "quote": "..." }` (текст может включать автора).
* `GET /api/news` — список новостей: `[{ "id", "title", "content", "date", "created_at?" }, ...]`.
* `GET /api/tests` — список тестов: `[{ "id", "title", "description", "slug" }, ...]`.
* `GET /api/test/{test_id}` — тест с вопросами без правильных ответов: `{ "id", "title", "description", "slug", "questions": [{ "id", "prompt", "options": ["...", ...] }] }`.
* `POST /api/test/submit` — тело JSON `{ "test_id": number, "answers": { "<question_id>": 0..3 } }` → `{ "correct", "total", "percent" }`.
* `GET /api/calendar` — события: `[{ "id", "title", "event_date", "description" }, ...]`.
* `GET /api/videos` — `[{ "id", "title", "url" }, ...]` (url для iframe).
* `GET /api/novel/updates` — `[{ "id", "title", "body", "update_date" }, ...]`.

**Авторизация (JWT)**

* `POST /api/register` — `{ "username", "email", "password" }` → при успехе также `access_token`, `token_type`, `user`.
* `POST /api/login` — `{ "username": "<логин или email>", "password" }` → `access_token`, `token_type`, `user`.
* `GET /api/user/me` — заголовок `Authorization: Bearer <access_token>` → профиль `{ "id", "username", "email", "created_at" }`.

Секрет подписи JWT: переменная окружения `JWT_SECRET` (см. `.env.example`). Пароли в БД хранятся в виде хэша (passlib: argon2 / pbkdf2 / bcrypt).

## 6. Фронтенд и API

* Общий клиент: `frontend/api.js` (`window.MosAPI`), токен в `localStorage` (`access_token`).
* Скрипты страниц: `home.js`, `news.js`, `tests_page.js`, `test_run.js`, `login_page.js`, `register_page.js`, `account_page.js`, `calendar_page.js`, `video_page.js`, `novel_page.js`.

## 7. Правила разработки (Для ИИ и команды)
1.  **Разделение:** Бэкенд никогда не верстает страницы, фронтенд не пишет логику БД.
2.  **Стиль:** Код должен быть чистым, с комментариями.
3.  **Безопасность (MVP):** Пароли хэшируются (passlib); для сессии используется JWT (`JWT_SECRET` в окружении).
4.  **CORS:** Всегда держать включенным `CORSMiddleware` для связи `frontend` <-> `backend`.
5.  **Пути:** Все статические файлы фронтенда обслуживаются через `app.mount` в `main.py`.
6.  **Контекст ИИ:** При внесении любых правок в код:
    *   Проверять совместимость с существующей БД (`database.sqlite`).
    *   Соблюдать структуру папок.
    *   Если добавляется новый функционал, предлагать его реализацию сразу для обеих частей (Backend -> Frontend).
