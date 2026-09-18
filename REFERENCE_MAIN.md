# Справка о рабочей версии main

Эта страница нужна только для понимания состояния проекта. Не копируй код main и
не пытайся синхронизировать архитектуру без прямой просьбы.

Проверено 18 сентября 2026 года:

- репозиторий: `melswg/MosPolyPhisics`;
- рабочая ветка: `main`;
- последний известный commit: `24560d7` (`fix: clarify guest account navigation`);
- публичный HTTP preview: `http://151.242.88.138:9090/`;
- процесс: systemd `mosphysics.service`, не Docker;
- production SQLite отделена от исходного кода;
- реализованы server-side cookie sessions, CSRF logout, password reset flow;
- гость аккаунта видит вход/регистрацию, пользователь — кабинет/выход;
- ежедневный SQLite backup timer активен;
- GitHub Actions запускает pytest и JS regression checks;
- SSH auto-deploy подготовлен, но ожидает GitHub Secrets и флаг включения;
- SMTP, домен и HTTPS ещё не настроены;
- реальные роли текущей команды и часть контента требуют подтверждения.

Production main продолжает развиваться отдельно через Codex. Hermes-версия не
должна использовать production БД, сервис, cookies или секреты.
