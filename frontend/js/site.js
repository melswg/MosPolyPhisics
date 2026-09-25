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

  /* Запросы: 404 это отсутствие материалов, остальное ошибка */

  async function requestJson(url, options) {
    let response;
    try {
      response = await fetch(url, Object.assign({ headers: { Accept: "application/json" } }, options || {}));
    } catch (error) {
      return { state: "error", status: 0 };
    }

    if (response.status === 404) {
      return { state: "empty", status: 404 };
    }
    if (!response.ok) {
      return { state: "error", status: response.status };
    }
    try {
      return { state: "ok", data: await response.json() };
    } catch (error) {
      return { state: "error", status: response.status };
    }
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
    items.forEach((item) => {
      const article = createElement("article", "news__item");
      article.appendChild(createElement("p", "news__date", formatDate(item.date)));
      article.appendChild(createElement("h3", null, item.title));
      String(item.content || "")
        .split(/\n{2,}/)
        .filter((part) => part.trim())
        .forEach((part) => article.appendChild(createElement("p", null, part.trim())));
      grid.appendChild(article);
    });
    host.appendChild(grid);
  }

  async function loadNews(host) {
    renderLoading(host, "Проверяем ленту новостей.");
    const result = await requestJson("/api/news");
    if (result.state === "error") {
      renderError(host, "Лента недоступна. Проверьте соединение и попробуйте снова.", () => loadNews(host));
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
    text.appendChild(createElement("p", null, "Войдите или зарегистрируйтесь, чтобы сохранять результаты тестов. Раздел аккаунта ещё в разработке."));
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
    logout.dataset.notice = "Выход появится вместе с разделом аккаунта.";
    buttons.appendChild(logout);
    box.appendChild(text);
    box.appendChild(buttons);
    host.appendChild(box);
    initNotices();
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
    const result = await requestJson(`/api/tests/${encodeURIComponent(testId)}`);
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

  /* Токен из ссылки восстановления: в интерфейсе не показывается */

  function initResetToken() {
    const field = document.getElementById("reset-token");
    if (!field) {
      return;
    }
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      field.value = token;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initMenu();
    initNotices();
    initNews();
    initAccount();
    initTest();
    initCalendar();
    initResetToken();
  });
})();
