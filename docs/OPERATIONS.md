# Эксплуатация МосПолиФизикс

Актуальная схема VPS: репозиторий `/home/hermes/MosPolyPhisics`, виртуальное
окружение `.venv`, systemd-сервис `mosphysics.service`, локальный порт 9090 и
SQLite-файл `data/database.sqlite`. Перенос в Docker для автодеплоя не требуется.

## Автодеплой из GitHub

Workflow `.github/workflows/test-and-deploy.yml` запускает тесты на каждый push в
`main` и только после успеха обновляет VPS через SSH. В GitHub Environment
`production` нужно создать секреты:

- `VPS_HOST` — адрес сервера;
- `VPS_USER` — SSH-пользователь с точечным `sudo` для команд деплоя;
- `VPS_PORT` — SSH-порт, можно не задавать для 22;
- `VPS_SSH_PRIVATE_KEY` — отдельный закрытый deploy-ключ;
- `VPS_KNOWN_HOSTS` — заранее проверенная строка ключа хоста, не результат
  отключения `StrictHostKeyChecking`.

После проверки секретов задайте в Environment переменную
`VPS_AUTO_DEPLOY=true`. Пока её нет, workflow выполняет тесты, но намеренно
пропускает подключение к VPS.

Публичный ключ deploy-ключа добавляется только нужному пользователю VPS. Команды
`git`, перезапуска `mosphysics.service` и скрипта деплоя следует разрешить через
минимальное правило sudo, а не полный беспарольный root. Первый запуск workflow
выполняется вручную и проверяется по `/api/health`; после этого push в `main`
становится автоматическим релизом.

## Домен и HTTPS

1. Направить A-запись выбранного домена на IP VPS.
2. Заменить `physics.example.org` в `deploy/nginx-mosphysics.conf.example`,
   установить конфигурацию Nginx и проверить `nginx -t`.
3. Получить сертификат Let's Encrypt через Certbot и проверить автообновление.
4. В окружении `mosphysics.service` задать `PUBLIC_BASE_URL=https://<домен>` и
   `SESSION_COOKIE_SECURE=true`, затем перезапустить сервис.
5. Проверить регистрацию, вход, кабинет, выход и восстановление пароля по HTTPS.

До появления домена сайт продолжает работать по HTTP на порту 9090, поэтому
`SESSION_COOKIE_SECURE` должен оставаться `false`.

## SMTP

Переменные `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_FROM`, `SMTP_USE_TLS` и `PUBLIC_BASE_URL` задаются только в окружении
сервиса. Без SMTP запрос восстановления отвечает одинаково для существующего и
несуществующего адреса, но письмо не отправляется; токен не попадает в журнал.

## Резервные копии

Скрипт `backend/backup_database.py` использует SQLite Online Backup API, проверяет
`PRAGMA integrity_check` и хранит последние 14 копий. Для установки таймера:

```bash
sudo install -m 0644 deploy/mosphysics-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/mosphysics-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mosphysics-backup.timer
sudo systemctl start mosphysics-backup.service
sudo systemctl status mosphysics-backup.service --no-pager
```

Каталог `/home/hermes/backups/mosphysics` должен быть доступен только владельцу и
копироваться на отдельный носитель или сервер: локальная копия не защищает от
потери всего VPS.

## Проверка восстановления

Восстановление сначала проверяется в отдельном каталоге, не поверх рабочей БД:

```bash
mkdir -p /tmp/mosphysics-restore-check
cp /home/hermes/backups/mosphysics/mosphysics-YYYYMMDDTHHMMSSZ.sqlite /tmp/mosphysics-restore-check/database.sqlite
sqlite3 /tmp/mosphysics-restore-check/database.sqlite 'PRAGMA integrity_check;'
MOSPHYSICS_DATABASE=/tmp/mosphysics-restore-check/database.sqlite .venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 9091
```

После проверки остановить тестовый процесс. Замена production-БД выполняется
только при остановленном сервисе и после сохранения отдельной копии текущего
файла. Нельзя удалять volume, рабочую БД или резервные копии командой очистки.

## Откат приложения

При неуспешной проверке здоровья systemd показывает статус, а workflow завершается
ошибкой. Для отката выбрать последний проверенный commit, выполнить обычный
`git revert` в `main` и дождаться повторного workflow. Это сохраняет линейную
историю и не требует force push или `reset --hard`.
