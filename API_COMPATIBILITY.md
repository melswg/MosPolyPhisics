# API-совместимость

Это фактические контракты `main` commit `24560d7`. Новая архитектура может быть
чище, но рабочий сценарий нельзя удалить случайно. При смене пути обновляются
frontend, тесты и этот документ; для публичных read-only endpoint допустим alias.

## Публичное чтение

| Метод и путь | Успешный ответ |
|---|---|
| `GET /api/health` | `{"status":"ok"}` |
| `GET /api/quote` | `{"quote":"текст — автор"}` |
| `GET /api/news` | массив `{id,title,content,date,created_at}` |
| `GET /api/tests` | массив `{id,title,description,slug}` |
| `GET /api/test/{id}` | `{id,title,description,slug,questions:[{id,prompt,options}]}` |
| `POST /api/test/submit` | body `{test_id,answers:{question_id:option_index}}`; ответ `{correct,total,percent}` |
| `GET /api/calendar` | массив `{id,title,event_date,description}` |
| `GET /api/videos` | массив `{id,title,url}` |
| `GET /api/novel/updates` | массив `{id,title,body,update_date}` |

Правильный ответ теста не выдаётся до submit. Целевая версия должна дополнить
результат разбором каждого вопроса, не раскрывая его в начальном payload.

## Авторизация

| Метод и путь | Контракт |
|---|---|
| `POST /api/register` | `{username,email,password}`, 201, устанавливает session cookie |
| `POST /api/login` | `{username,password}`; `username` принимает имя или email |
| `GET /api/user/me` | `{id,username,email,created_at,csrf_token}` или 401 |
| `POST /api/logout` | требует cookie и `X-CSRF-Token`, 204; иначе 401/403 |
| `POST /api/password-reset/request` | `{email}`, одинаковый 200 независимо от существования адреса |
| `POST /api/password-reset/confirm` | `{token,new_password}`, одноразовый токен |

Ограничения регистрации: username 3–32, буквы/цифры/точка/дефис/underscore;
email 5–254 и базовая email-валидация; пароль 10–128, минимум буква и цифра.
Сессия живёт 7 дней. Сброс пароля живёт 30 минут, одноразовый и отзывает сессии.

## Целевые дополнения

- `GET /api/news/{id}` для постоянной страницы новости;
- `POST /api/admin/news`, `PUT /api/admin/news/{id}`;
- роль `user/admin`, назначение admin только локальной операцией владельца;
- объяснения в результате теста;
- при развитии: CRUD опубликованных видео, событий и материалов новеллы.

## Правила изменения

1. Не поддерживать два независимых каталога контента во frontend и backend.
2. Ошибка API не превращается в пустой успешный массив.
3. 401 означает отсутствие сессии, 403 — недостаток прав/CSRF.
4. Пользовательские строки выводятся через `textContent` или безопасный renderer.
5. Изменение контракта сопровождается интеграционным тестом и обновлением клиента.
6. Не переносить старые access tokens из `localStorage`; актуальна cookie-session.
