# Симплик до замены материалов 21 октября 2026

Точная копия реализации из коммита `3dbcdac`, до подключения PNG команды

- `avatar.js` → `frontend/js/avatar.js`: все прежние рисованные SVG-слои
- `avatars.py` → `backend/avatars.py`: значения и подписи опций
- `mas.svg` → `assets/brand/mas.svg`: исходный маскот
- `styles.css`: снимок стилей, блок `.simplik` и `.profile .simplik`
- `site.js`: снимок редактора, `initAvatarEditor` и `updateHeaderAvatar`

Для возврата использовать старый renderer и связанные правила `.simplik`,
затем обновить версию ресурсов на страницах. Не заменять весь styles.css
или site.js поверх более поздних несвязанных изменений

Данные пользователей, пароли и БД в архив не входят
