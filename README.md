# МосПолиФизикс — экспериментальная версия Hermes

Это чистый workspace для новой реализации сайта. Он изолирован от текущей ветки
`main`, production-сервиса и production-базы.

## Где находится

- Каталог: `/Users/malikamkhadov/Documents/ChatGPT/МосПолиФизикс/hermes-rebuild`
- Ветка: `feature/hermes-rebuild`
- Основной проект `main`: не изменять из этого workspace.

## Как начать в Hermes

Открой Hermes в этом каталоге либо передай ему команду:

```bash
cd "/Users/malikamkhadov/Documents/ChatGPT/МосПолиФизикс/hermes-rebuild"
```

Первое сообщение Hermes:

```text
Полностью прочитай AGENTS.md и все обязательные Markdown-файлы, перечисленные в
нём. Проверь ветку и git status. Это чистая экспериментальная реализация
«МосПолиФизикс» с нуля. Начни первый незавершённый пункт ROADMAP.md, сразу
реализуй минимальный рабочий вертикальный сценарий, проверь его и обнови STATUS.md.
Не трогай main, production-сервис, production-БД и порт 9090.
```

## Назначение документов

- `HERMES_BRIEF.md` — продукт и полный объём.
- `ARCHITECTURE.md` — технические контракты и структура.
- `CURRENT_PRODUCT_INVENTORY.md` — полный снимок нынешних разделов и их готовности.
- `API_COMPATIBILITY.md` — действующие API-контракты и правила совместимости.
- `PAGES.md` — страницы и состояния.
- `CONTENT.md` — подтверждённые факты и пробелы.
- `DATA_TRANSFER.md` — что и как безопасно переносить в новую реализацию.
- `KANBAN_SCOPE.md` — требования из переданной Trello-доски.
- `ROADMAP.md` — порядок реализации.
- `ACCEPTANCE.md` — критерии готовности.
- `STATUS.md` — живая память между сессиями.
- `REFERENCE_MAIN.md` — где остановилась рабочая версия `main`.

## Локальный запуск

Воспроизводимый запуск минимального вертикального сценария (H0):

```bash
cd "/Users/malikamkhadov/Documents/ChatGPT/МосПолиФизикс/hermes-rebuild"
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements-dev.txt
./.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8011
```

Адрес preview — <http://127.0.0.1:8011>. Проверка:

```bash
curl -s http://127.0.0.1:8011/api/health
./.venv/bin/python -m pytest
```

Отдельная БД живёт в игнорируемом каталоге `data/`; путь переопределяется через
`MOSPHYSICS_DATABASE`. Обычный старт не применяет миграции и не создаёт публичные
записи, миграции запускаются отдельно:

```bash
./.venv/bin/python scripts/migrate.py
```

Запуск в Docker:

```bash
docker compose up --build
```

Конфигурация берётся из окружения, пример переменных без реальных значений —
в `.env.example`. Порт 8011 и каталог `data/` не пересекаются с production-сервисом
на 9090.

## Стиль и страницы

Визуальный стиль зафиксирован в `STYLE.md`: это выбранное направление
«доработанная старая версия». Перед любой работой над фронтендом читать его.

Страницы отдаёт `backend/routes/pages.py`:

| Адрес | Файл | Что внутри |
|---|---|---|
| `/` | `frontend/index.html` | цитата дня, описание проекта, карточки разделов, лента новостей |
| `/about` | `pages/about.html` | подтверждённые факты о проекте, куратор, исторический состав |
| `/news` | `pages/news.html` | лента новостей из API |
| `/projects` | `pages/projects.html` | хаб направлений практики |
| `/video` | `pages/video.html` | записи проекта, правила публикации |
| `/calendar` | `pages/calendar.html` | календарь месяца и список событий |
| `/novel` | `pages/novel.html` | визуальная новелла: описание, лор, галерея, дневник, сборка |
| `/tests` | `pages/tests.html` | каталог четырёх направлений тестов |
| `/test` | `pages/test.html` | прохождение теста с проверкой ответов |
| `/ege` | `pages/ege.html` | задания ЕГЭ и разборы |
| `/quotes` | `pages/quotes.html` | викторина цитат |
| `/account` | `pages/account.html` | состояние входа, кабинет |
| `/login` | `pages/login.html` | вход |
| `/register` | `pages/register.html` | регистрация |
| `/password-reset` | `pages/password-reset.html` | запрос ссылки на смену пароля |
| `/password-reset/confirm` | `pages/password-reset-confirm.html` | новый пароль по одноразовой ссылке |

Разделы без подтверждённых материалов показывают честные состояния, а не заглушки:
статические сведения о проекте живут в HTML, новости приходят только из API,
демонстрационных записей нет.

## Что означает «с нуля»

С нуля создаются архитектура, HTML/CSS и серверный код. Не обнуляются требования:
новая версия обязана сохранить все полезные разделы и пользовательские сценарии
текущего сайта. Старые демозаписи, фиктивные ссылки и production-пользователи не
переносятся. Подтверждённое стартовое наполнение лежит в
`content/verified_content.json`, а полный разбор наследия — в
`CURRENT_PRODUCT_INVENTORY.md`.
