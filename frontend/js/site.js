/* МосПолиФизикс: тема, мобильное меню, состояния данных. Спецификация: STYLE.md */

(function () {
  "use strict";

  const THEME_KEY = "mosphysics-theme";
  const MONTH_NAMES = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];
  const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  /* Тема */

  function initTheme() {
    const button = document.getElementById("theme-switch");
    if (!button) {
      return;
    }

    function paint() {
      const dark = document.documentElement.dataset.theme !== "light";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
    }

    paint();
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        /* приватный режим браузера: выбор просто не сохранится */
      }
      paint();
    });
  }

  /* Мобильное меню */

  function initMenu() {
    const button = document.getElementById("menu-button");
    const menu = document.getElementById("main-menu");
    if (!button || !menu) {
      return;
    }

    function setOpen(open) {
      menu.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    }

    button.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        button.focus();
      }
    });
  }

  /* Честные сообщения о неготовых действиях и формах */

  function initNotices() {
    document.querySelectorAll("[data-notice]").forEach((control) => {
      control.addEventListener("click", (event) => {
        const target = control.closest("form, section, .account");
        const notice = target ? target.querySelector(".form__notice") : null;
        if (!notice) {
          return;
        }
        if (event.type === "submit") {
          event.preventDefault();
        }
        notice.classList.remove("form__notice--error", "form__notice--success");
        notice.textContent = control.dataset.notice;
      });
    });

    document.querySelectorAll("form[data-notice]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const notice = form.querySelector(".form__notice");
        if (notice) {
          notice.classList.remove("form__notice--error", "form__notice--success");
          notice.textContent = form.dataset.notice;
        }
      });
    });
  }

  /* Запросы: единый разбор ответа для контента и форм */

  async function requestJson(url, options) {
    let response;
    try {
      response = await fetch(
        url,
        Object.assign({ headers: { Accept: "application/json" }, credentials: "same-origin" }, options || {})
      );
    } catch (error) {
      return { state: "error", status: 0 };
    }

    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = null;
    }
    if (response.status === 404) {
      return { state: "empty", status: 404, data };
    }
    if (!response.ok) {
      return { state: "error", status: response.status, data };
    }
    return { state: "ok", status: response.status, data };
  }

  function errorMessage(result, fallback) {
    if (result && result.data && typeof result.data.detail === "string") {
      return result.data.detail;
    }
    return fallback;
  }

  /* Состояния */

  function renderLoading(host, text) {
    clear(host);
    const state = createElement("div", "state state--loading");
    state.setAttribute("aria-busy", "true");
    state.appendChild(createElement("h3", null, "Загружаем материалы"));
    state.appendChild(createElement("p", null, text));
    host.appendChild(state);
  }

  function renderEmpty(host, title, text) {
    clear(host);
    const state = createElement("div", "state");
    state.appendChild(createElement("h3", null, title));
    state.appendChild(createElement("p", null, text));
    host.appendChild(state);
    return state;
  }

  function renderError(host, text, retry) {
    clear(host);
    const state = createElement("div", "state state--error");
    state.setAttribute("role", "alert");
    state.appendChild(createElement("h3", null, "Не удалось загрузить материалы"));
    state.appendChild(createElement("p", null, text));
    const action = createElement("p", "state__action");
    const button = createElement("button", "btn", "Попробовать снова");
    button.type = "button";
    button.addEventListener("click", retry);
    action.appendChild(button);
    state.appendChild(action);
    host.appendChild(state);
    return state;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
      .format(date)
      .replace(" г.", "");
  }

  /* Новости */

  function renderNews(host, items) {
    clear(host);
    const grid = createElement("div", "news");
    const isCarousel = host.dataset.news === "carousel" || window.location.pathname === "/" || window.location.pathname === "/index.html";
    if (isCarousel) {
      grid.classList.add("news--carousel");
      grid.tabIndex = 0;
      grid.setAttribute("aria-label", "Новости проекта, горизонтальная прокрутка");
    }
    const dialog = createElement("dialog", "news-dialog");
    const close = createElement("button", "news-dialog__close", "Закрыть ×");
    close.type = "button";
    close.addEventListener("click", () => dialog.close());
    const body = createElement("div", "news-dialog__body");
    dialog.append(close, body);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    items.forEach((item) => {
      const article = createElement("article", "news-detail");
      article.appendChild(createElement("p", "news__date", formatDate(item.date)));
      article.appendChild(createElement("h3", null, item.title));
      if (Array.isArray(item.images) && item.images.length) {
        const gallery = createElement("div", "news__images");
        item.images.forEach((url, index) => {
          if (!/^\/news-media\/[a-f0-9]{64}\.jpg$/.test(url)) return;
          const link = createElement("a");
          link.href = url;
          const image = createElement("img", "news__image");
          image.src = url;
          image.alt = `${item.title} — изображение ${index + 1}`;
          image.loading = "lazy";
          link.appendChild(image);
          gallery.appendChild(link);
        });
        article.appendChild(gallery);
      }
      String(item.content || "")
        .split(/\n{2,}/)
        .filter((part) => part.trim())
        .forEach((part) => article.appendChild(createElement("p", null, part.trim())));
      if (typeof item.source === "string" && /^https:\/\/t\.me\/[A-Za-z0-9_]+\/[0-9]+$/.test(item.source)) {
        const source = createElement("a", "news__source", "Открыть в Telegram");
        source.href = item.source;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        article.appendChild(source);
      }
      const card = createElement("article", "news__item");
      const open = createElement("button", "news__open");
      open.type = "button";
      open.setAttribute("aria-label", `Читать новость: ${item.title}`);
      open.appendChild(createElement("span", "news__date", formatDate(item.date)));
      open.appendChild(createElement("span", "news__title", item.title));
      const cover = createElement("span", "news__cover");
      const imageUrl = Array.isArray(item.images) && item.images.find((url) => /^\/news-media\/[a-f0-9]{64}\.jpg$/.test(url));
      if (imageUrl) {
        const image = createElement("img", "news__cover-image");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        const blur = image.cloneNode();
        blur.className = "news__cover-blur";
        cover.append(image, blur);
      } else {
        cover.classList.add("news__cover--empty");
        cover.textContent = "МосПолиФизикс";
      }
      open.appendChild(cover);
      open.addEventListener("click", () => {
        clear(body);
        body.appendChild(article);
        dialog.setAttribute("aria-label", item.title);
        dialog.showModal();
      });
      card.appendChild(open);
      grid.appendChild(card);
    });
    if (isCarousel) {
      const slider = createElement("div", "news-slider");
      [-1, 1].forEach((direction) => {
        const button = createElement("button", "news__arrow", direction < 0 ? "←" : "→");
        button.type = "button";
        button.setAttribute("aria-label", direction < 0 ? "Предыдущие новости" : "Следующие новости");
        button.addEventListener("click", () => {
          grid.scrollBy({left: direction * (grid.firstElementChild.getBoundingClientRect().width + 20),
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
        });
        if (direction < 0) slider.append(button, grid);
        else slider.appendChild(button);
      });
      host.append(slider, dialog);
    } else {
      host.append(grid, dialog);
    }
  }

  async function loadNews(host) {
    renderLoading(host, "Проверяем ленту новостей.");
    const result = await requestJson("/api/news");
    if (result.state === "error") {
      renderError(host, "Лента недоступна. Проверьте соединение и попробуйте снова.", () => loadNews(host));
      return;
    }
    if (host.dataset.news === "sections") {
      clear(host);
      const items = Array.isArray(result.data) ? result.data : [];
      [["publications", "Публикации"], ["announcements", "Анонсы"], ["memes", "Мемы"]].forEach(([key, title]) => {
        const section = createElement("section", "news-section");
        const heading = createElement("h2", null, title);
        heading.id = `news-${key}`;
        section.setAttribute("aria-labelledby", heading.id);
        const content = createElement("div");
        const selected = items.filter((item) => (item.section || "publications") === key);
        if (selected.length) renderNews(content, selected);
        else renderEmpty(content, "Пока нет записей", "Новые материалы появятся здесь после публикации.");
        section.append(heading, content);
        host.appendChild(section);
      });
      return;
    }
    if (result.state === "empty" || !Array.isArray(result.data) || result.data.length === 0) {
      renderEmpty(host, "Пока нет опубликованных записей", "Новости появляются здесь только после проверки материала командой.");
      return;
    }
    renderNews(host, result.data);
  }

  function initNews() {
    const host = document.querySelector("[data-news]");
    if (host) {
      loadNews(host);
    }
  }

  /* Личный кабинет */

  function renderGuest(host) {
    clear(host);
    const box = createElement("div", "account");
    const text = createElement("div");
    text.appendChild(createElement("h2", null, "Вы не вошли в аккаунт"));
    text.appendChild(createElement("p", null, "Войдите или зарегистрируйтесь, чтобы открыть личный кабинет."));
    const buttons = createElement("div", "account__buttons");
    const login = createElement("a", "btn", "Войти");
    login.href = "/login";
    const register = createElement("a", "btn btn--ghost", "Зарегистрироваться");
    register.href = "/register";
    buttons.appendChild(login);
    buttons.appendChild(register);
    box.appendChild(text);
    box.appendChild(buttons);
    host.appendChild(box);
  }

  function renderUser(host, user) {
    clear(host);
    const box = createElement("div", "account");
    const text = createElement("div");
    text.appendChild(createElement("h2", null, `Здравствуйте, ${user.username}`));
    text.appendChild(createElement("p", null, user.email || ""));
    const buttons = createElement("div", "account__buttons");
    const logout = createElement("button", "btn", "Выйти");
    logout.type = "button";
    const notice = createElement("p", "form__notice");
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      const result = await requestJson("/api/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": user.csrf_token || "" },
      });
      if (result.state === "ok") {
        window.location.href = "/";
        return;
      }
      logout.disabled = false;
      notice.classList.add("form__notice--error");
      notice.textContent = "Не удалось выйти. Обновите страницу и попробуйте снова.";
    });
    buttons.appendChild(logout);
    box.appendChild(text);
    box.appendChild(buttons);
    box.appendChild(notice);
    host.appendChild(box);
  }

  async function loadAccount(host) {
    renderLoading(host, "Проверяем вход.");
    const result = await requestJson("/api/user/me");
    if (result.state === "ok" && result.data && result.data.username) {
      renderUser(host, result.data);
      return;
    }
    if (result.state === "empty" || result.status === 401) {
      renderGuest(host);
      return;
    }
    renderError(host, "Не удалось проверить вход. Это техническая ошибка, а не отсутствие аккаунта.", () => loadAccount(host));
  }

  function initAccount() {
    const host = document.querySelector("[data-account]");
    if (host) {
      loadAccount(host);
    }
  }

  /* Прохождение теста */

  function renderQuestions(host, test) {
    clear(host);
    const form = createElement("form", "form");
    form.noValidate = true;
    host.appendChild(createElement("h2", null, test.title));
    if (test.description) {
      host.appendChild(createElement("p", "muted", test.description));
    }
    (test.questions || []).forEach((question, index) => {
      const field = createElement("fieldset", "form__field");
      field.appendChild(createElement("legend", null, `${index + 1}. ${question.prompt}`));
      (question.options || []).forEach((option, optionIndex) => {
        const label = createElement("label");
        const input = createElement("input");
        input.type = "radio";
        input.name = `question-${question.id}`;
        input.value = String(optionIndex);
        input.required = true;
        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${option}`));
        field.appendChild(label);
      });
      form.appendChild(field);
    });
    const actions = createElement("div", "form__actions");
    const submit = createElement("button", "btn", "Отправить ответы");
    submit.type = "submit";
    actions.appendChild(submit);
    form.appendChild(actions);
    form.appendChild(createElement("p", "form__notice"));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitAnswers(form, test, submit);
    });
    host.appendChild(form);
  }

  async function submitAnswers(form, test, button) {
    const notice = form.querySelector(".form__notice");
    const answers = {};
    let incomplete = false;
    (test.questions || []).forEach((question) => {
      const checked = form.querySelector(`input[name="question-${question.id}"]:checked`);
      if (checked) {
        answers[question.id] = Number(checked.value);
      } else {
        incomplete = true;
      }
    });
    notice.classList.remove("form__notice--error", "form__notice--success");
    if (incomplete) {
      notice.textContent = "Ответьте на все вопросы, прежде чем отправлять.";
      return;
    }

    button.setAttribute("aria-busy", "true");
    button.disabled = true;
    const result = await requestJson("/api/test/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ test_id: test.id, answers }),
    });
    button.removeAttribute("aria-busy");
    button.disabled = false;

    if (result.state !== "ok" || !result.data) {
      notice.classList.add("form__notice--error");
      notice.textContent = "Ответы не отправлены: проверьте соединение и попробуйте снова.";
      return;
    }

    notice.classList.add("form__notice--success");
    notice.textContent = `Верных ответов: ${result.data.correct} из ${result.data.total} (${result.data.percent}%).`;
  }

  async function loadTest(host) {
    const testId = new URLSearchParams(window.location.search).get("id");
    if (!testId) {
      renderEmpty(host, "Тест не выбран", "Откройте тест из каталога: сейчас наборы вопросов готовятся, поэтому каталог ведёт сюда только после публикации.");
      return;
    }

    renderLoading(host, "Загружаем вопросы.");
    const result = await requestJson(`/api/test/${encodeURIComponent(testId)}`);
    if (result.state === "error") {
      renderError(host, "Вопросы недоступны. Проверьте соединение и попробуйте снова.", () => loadTest(host));
      return;
    }
    if (result.state === "empty" || !result.data) {
      renderEmpty(host, "Набор вопросов готовится", "Тест откроется, когда формулировки и объяснения ответов будут проверены.");
      return;
    }
    renderQuestions(host, result.data);
  }

  function initTest() {
    const host = document.querySelector("[data-test]");
    if (host) {
      loadTest(host);
    }
  }

  /* Календарь */

  function renderCalendar(host, monthDate) {
    clear(host);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const card = createElement("div", "calendar");
    const weekdays = createElement("div", "calendar__weekdays");
    WEEK_DAYS.forEach((day) => weekdays.appendChild(createElement("span", null, day)));
    card.appendChild(weekdays);

    const grid = createElement("div", "calendar__grid");
    for (let index = 0; index < startOffset; index += 1) {
      grid.appendChild(createElement("div", "calendar__day calendar__day--outside"));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = createElement("div", "calendar__day", String(day));
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      if (isToday) {
        cell.classList.add("calendar__day--today");
      }
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    host.appendChild(card);

    const monthLabel = document.querySelector("[data-month-label]");
    if (monthLabel) {
      monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;
    }
  }

  function initCalendar() {
    const host = document.querySelector("[data-calendar]");
    if (!host) {
      return;
    }

    let current = new Date();
    const previous = document.querySelector("[data-month-previous]");
    const next = document.querySelector("[data-month-next]");

    function shift(step) {
      current = new Date(current.getFullYear(), current.getMonth() + step, 1);
      renderCalendar(host, current);
    }

    if (previous) {
      previous.addEventListener("click", () => shift(-1));
    }
    if (next) {
      next.addEventListener("click", () => shift(1));
    }
    renderCalendar(host, current);
  }

  /* Авторизация и восстановление доступа */

  function formNotice(form) {
    return form.querySelector(".form__notice");
  }

  function setFormState(form, message, kind) {
    const notice = formNotice(form);
    if (!notice) {
      return;
    }
    notice.classList.remove("form__notice--error", "form__notice--success");
    if (kind) {
      notice.classList.add(`form__notice--${kind}`);
    }
    notice.textContent = message;
  }

  function setSubmitting(form, submitting) {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = submitting;
      button.toggleAttribute("aria-busy", submitting);
    }
  }

  function initLogin() {
    const form = document.querySelector("[data-login-form]");
    if (!form) {
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setSubmitting(form, true);
      setFormState(form, "", null);
      const result = await requestJson("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: form.elements.username.value.trim(),
          password: form.elements.password.value,
        }),
      });
      if (result.state === "ok") {
        setFormState(form, "Вход выполнен. Открываем кабинет…", "success");
        window.location.href = "/account";
        return;
      }
      setSubmitting(form, false);
      setFormState(
        form,
        result.status === 401 ? "Неверное имя, почта или пароль." : "Не удалось войти. Проверьте соединение и попробуйте снова.",
        "error"
      );
    });
  }

  function initRegister() {
    const form = document.querySelector("[data-register-form]");
    if (!form) {
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setSubmitting(form, true);
      setFormState(form, "", null);
      const result = await requestJson("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: form.elements.username.value.trim(),
          email: form.elements.email.value.trim(),
          password: form.elements.password.value,
          accepted_personal_data_processing: form.elements.accepted_personal_data_processing.checked,
        }),
      });
      if (result.state === "ok") {
        setFormState(form, "Аккаунт создан. Открываем кабинет…", "success");
        window.location.href = "/account";
        return;
      }
      setSubmitting(form, false);
      setFormState(form, errorMessage(result, "Не удалось создать аккаунт."), "error");
    });
  }

  function initPasswordResetRequest() {
    const form = document.querySelector("[data-password-reset-request]");
    if (!form) {
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setSubmitting(form, true);
      const result = await requestJson("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: form.elements.email.value.trim() }),
      });
      setSubmitting(form, false);
      if (result.state === "ok") {
        setFormState(form, result.data.message, "success");
        return;
      }
      setFormState(form, errorMessage(result, "Не удалось отправить запрос. Попробуйте снова."), "error");
    });
  }

  function initPasswordResetConfirm() {
    const form = document.querySelector("[data-password-reset-confirm]");
    if (!form) {
      return;
    }
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token")
      || new URLSearchParams(window.location.search).get("token") || "";
    form.elements.token.value = token;
    if (token) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (!token) {
      form.querySelector('button[type="submit"]').disabled = true;
      setFormState(form, "Откройте ссылку из письма или запросите новую ниже.", "error");
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = form.elements.new_password.value;
      if (!token) {
        return;
      }
      if (password !== form.elements.new_password_repeat.value) {
        setFormState(form, "Пароли не совпадают.", "error");
        return;
      }
      setSubmitting(form, true);
      const result = await requestJson("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      setSubmitting(form, false);
      if (result.state === "ok") {
        form.elements.new_password.value = "";
        form.elements.new_password_repeat.value = "";
        form.elements.token.value = "";
        form.querySelectorAll(".form__field").forEach((field) => { field.hidden = true; });
        form.querySelector('[type="submit"]').hidden = true;
        const login = form.querySelector("[data-reset-login]");
        login.textContent = "Войти с новым паролем";
        login.classList.remove("btn--ghost");
        setFormState(form, result.data.message, "success");
        login.focus();
        return;
      }
      if (result.status === 400) {
        form.querySelector('button[type="submit"]').disabled = true;
      }
      setFormState(form, errorMessage(result, "Не удалось изменить пароль."), "error");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMenu();
    initNotices();
    initNews();
    initAccount();
    initLogin();
    initRegister();
    initPasswordResetRequest();
    initPasswordResetConfirm();
    initTest();
    initCalendar();
  });
})();
