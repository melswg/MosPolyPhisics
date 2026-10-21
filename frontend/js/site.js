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

  async function loadQuote() {
    const text = document.querySelector("[data-quote-text]");
    if (!text) return;
    const author = document.querySelector("[data-quote-author]");
    const source = document.querySelector("[data-quote-source]");
    const status = document.querySelector("[data-quote-status]");
    const retry = document.querySelector("[data-quote-retry]");
    retry.hidden = true;
    status.textContent = "";
    const result = await requestJson("/api/quote");
    author.textContent = "";
    source.hidden = true;
    source.removeAttribute("href");
    if (result.state === "error") {
      text.textContent = "Цитата пока недоступна";
      status.textContent = "Проверьте соединение и попробуйте снова.";
      retry.hidden = false;
      return;
    }
    const quote = result.data;
    if (!quote || !quote.text || !quote.author || !/^https:\/\//.test(quote.source || "")) {
      text.textContent = "Новые идеи начинаются с вопросов";
      status.textContent = "Цитаты учёных появятся после проверки источников.";
      return;
    }
    text.textContent = quote.text;
    author.textContent = quote.author;
    source.href = quote.source;
    source.hidden = false;
  }

  function initQuote() {
    const retry = document.querySelector("[data-quote-retry]");
    if (retry) {
      retry.addEventListener("click", loadQuote);
      loadQuote();
    }
  }

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
    const rubric = new URLSearchParams(window.location.search).get("rubric");
    const rubrics = { comics: ["Комиксы", "комиксы"], history: ["Историческая справка", "историческая справка"] };
    if (host.dataset.news === "sections" && (rubric === "comics" || rubric === "history")) {
      host.classList.add("news-columns--filtered");
      const [title, category] = rubrics[rubric];
      const heading = document.querySelector("#news-page-title");
      if (heading) heading.textContent = title;
      const items = (result.data || []).filter((item) => (item.category || "").trim().toLowerCase() === category);
      if (items.length) renderNews(host, items);
      else renderEmpty(host, "Материалы рубрики пока не опубликованы", "Загляните в общую ленту: там уже есть другие материалы проекта.");
      const link = createElement("a", "btn btn--ghost", "Все новости");
      link.href = "/news";
      host.appendChild(link);
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
        const content = createElement("div", "news-section__content");
        content.tabIndex = 0;
        content.setAttribute("role", "region");
        content.setAttribute("aria-labelledby", heading.id);
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
    if (window.MosAvatar) {
      updateHeaderAvatar(user.avatar);
      initAvatarEditor(host, user);
    }
  }

  function updateHeaderAvatar(config) {
    const profile = document.querySelector(".profile");
    if (!profile || !window.MosAvatar || !config) return;
    clear(profile);
    const image = createElement("span", "profile__avatar");
    image.setAttribute("aria-hidden", "true");
    window.MosAvatar.render(image, config);
    profile.appendChild(image);
  }

  async function initAvatarEditor(host, user) {
    const editor = createElement("section", "avatar-editor");
    editor.setAttribute("aria-label", "Настройка аватара Симплик");
    host.appendChild(editor);
    renderLoading(editor, "Загружаем варианты Симплика.");
    const result = await requestJson("/api/avatar/options");
    if (result.state !== "ok" || !result.data) {
      renderError(editor, "Не удалось загрузить варианты аватара.", () => { editor.remove(); initAvatarEditor(host, user); });
      return;
    }
    clear(editor);
    editor.appendChild(createElement("h2", null, "Ваш Симплик"));
    editor.appendChild(createElement("p", "muted", "Соберите своего спутника: выберите цвет, настроение и детали образа."));
    const layout = createElement("div", "avatar-editor__layout");
    const previewPanel = createElement("div", "avatar-editor__preview");
    const preview = createElement("div", "avatar-editor__image");
    preview.setAttribute("role", "img");
    const saved = createElement("p", "muted", "Изменения появятся в профиле после сохранения.");
    previewPanel.append(preview, saved);
    const form = createElement("form", "avatar-editor__form");
    const presets = createElement("div", "avatar-editor__presets");
    const controls = {};
    let selection = { ...result.data.default, ...user.avatar };
    let savedConfig = { ...selection };
    function paint() {
      window.MosAvatar.render(preview, selection);
      preview.setAttribute("aria-label", "Симплик: " + Object.entries(result.data.fields).map(([key, field]) => field.choices.find(([value]) => value === selection[key])?.[1]).join(", "));
      Object.entries(controls).forEach(([key, control]) => { control.value = selection[key]; });
      saved.textContent = JSON.stringify(selection) === JSON.stringify(savedConfig) ? "Этот образ сохранён в вашем профиле." : "Есть несохранённые изменения.";
      presets.querySelectorAll("button").forEach((button, index) => button.setAttribute("aria-pressed", String(JSON.stringify(selection) === JSON.stringify(result.data.presets[index].config))));
    }
    result.data.presets.forEach((preset) => {
      const button = createElement("button", "btn btn--ghost", preset.label);
      button.type = "button";
      button.addEventListener("click", () => { selection = { ...preset.config }; paint(); });
      presets.appendChild(button);
    });
    form.appendChild(createElement("h3", null, "Готовые образы"));
    form.appendChild(presets);
    const fields = createElement("div", "avatar-editor__fields");
    Object.entries(result.data.fields).forEach(([key, field]) => {
      const group = createElement("div", "form__field");
      const label = createElement("label", null, field.label);
      label.htmlFor = `avatar-${key}`;
      const select = createElement("select");
      select.id = label.htmlFor;
      select.name = key;
      field.choices.forEach(([value, title]) => {
        const option = createElement("option", null, title);
        option.value = value;
        select.appendChild(option);
      });
      controls[key] = select;
      select.addEventListener("change", () => { selection[key] = select.value; paint(); });
      group.append(label, select);
      fields.appendChild(group);
    });
    const actions = createElement("div", "avatar-editor__actions");
    const save = createElement("button", "btn", "Сохранить аватар");
    save.type = "submit";
    const reset = createElement("button", "btn btn--ghost", "Отменить изменения");
    reset.type = "button";
    reset.addEventListener("click", () => { selection = { ...savedConfig }; paint(); notice.textContent = ""; });
    const notice = createElement("p", "form__notice");
    notice.setAttribute("role", "status");
    actions.append(save, reset);
    form.append(fields, actions, notice);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitted = { ...selection };
      form.querySelectorAll("button, select").forEach((control) => { control.disabled = true; });
      notice.textContent = "Сохраняем…";
      const send = () => requestJson("/api/user/avatar", {
        method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": user.csrf_token || "" },
        body: JSON.stringify(submitted),
      });
      let response = await send();
      if (response.status === 403) {
        const current = await requestJson("/api/user/me");
        if (current.state === "ok" && current.data.id === user.id) {
          user.csrf_token = current.data.csrf_token;
          response = await send();
        }
      }
      form.querySelectorAll("button, select").forEach((control) => { control.disabled = false; });
      if (response.state === "ok") {
        user.avatar = response.data.avatar;
        savedConfig = { ...user.avatar };
        selection = { ...savedConfig };
        updateHeaderAvatar(user.avatar);
        paint();
        notice.textContent = "Аватар сохранён.";
      } else {
        notice.textContent = response.status === 401 ? "Войдите снова, чтобы сохранить аватар." : "Не удалось сохранить. Ваш выбор остался здесь — попробуйте ещё раз.";
        if (response.status === 401) {
          const login = createElement("a", null, " Открыть вход в новой вкладке");
          login.href = "/login";
          login.target = "_blank";
          login.rel = "noopener noreferrer";
          notice.appendChild(login);
        }
      }
    });
    layout.append(previewPanel, form);
    editor.appendChild(layout);
    paint();
  }

  async function initHeaderAvatar() {
    if (document.querySelector("[data-account]") || !window.MosAvatar) return;
    const result = await requestJson("/api/user/me");
    if (result.state === "ok") updateHeaderAvatar(result.data.avatar);
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

  async function loadTestCatalog(host) {
    renderLoading(host, "Проверяем опубликованные тесты.");
    const result = await requestJson("/api/tests");
    if (result.state !== "ok" || !Array.isArray(result.data)) {
      renderError(host, "Каталог тестов недоступен. Попробуйте снова.", () => loadTestCatalog(host));
      return;
    }
    const kind = host.dataset.testKind;
    const items = result.data.filter((test) => {
      const category = (test.slug || "").startsWith("quotes-") ? "quotes" : (test.slug || "").startsWith("fun-") ? "fun" : "physics";
      return !kind || category === kind;
    });
    if (!items.length) {
      renderEmpty(host, "Тесты пока не опубликованы", "Здесь появятся проверенные наборы вопросов.");
      return;
    }
    clear(host);
    const list = createElement("ul", "cards cards--catalog cards--pairs");
    items.forEach((test) => {
      const item = createElement("li");
      const link = createElement("a", "card");
      link.href = `/test?id=${encodeURIComponent(test.id)}`;
      const content = createElement("div");
      content.appendChild(createElement("h3", null, test.title));
      content.appendChild(createElement("p", null, test.description || "Проверьте знания по физике."));
      content.appendChild(createElement("p", "muted", `Вопросов: ${test.question_count}`));
      link.appendChild(content);
      item.appendChild(link);
      list.appendChild(item);
    });
    host.appendChild(list);
  }

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
    const notice = createElement("p", "form__notice");
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    form.appendChild(notice);
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
    form.querySelectorAll("input").forEach((input) => { input.disabled = true; });
    button.disabled = true;
    button.textContent = "Ответы проверены";
    const review = createElement("section", "panel");
    review.tabIndex = -1;
    review.setAttribute("aria-label", "Результат и разбор ответов");
    review.appendChild(createElement("h2", null, "Разбор ответов"));
    (result.data.review || []).forEach((answer, index) => {
      const item = createElement("article", "state");
      item.appendChild(createElement("h3", null, `${index + 1}. ${answer.prompt}`));
      item.appendChild(createElement("p", null, answer.is_correct ? "Верно" : "Неверно"));
      item.appendChild(createElement("p", null, `Ваш ответ: ${answer.options[answer.chosen_index]}`));
      item.appendChild(createElement("p", null, `Правильный ответ: ${answer.options[answer.correct_index]}`));
      item.appendChild(createElement("p", null, answer.explanation || "Объяснение для этого вопроса пока не опубликовано."));
      if (/^https:\/\//.test(answer.source || "")) {
        const source = createElement("a", null, "Учебный источник");
        source.href = answer.source;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        item.appendChild(source);
      }
      review.appendChild(item);
    });
    const retry = createElement("button", "btn btn--ghost", "Пройти ещё раз");
    retry.type = "button";
    retry.addEventListener("click", () => loadTest(form.parentElement));
    review.appendChild(retry);
    form.parentElement.appendChild(review);
    review.focus();
  }

  async function loadTest(host) {
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");
    if (kind === "physics" || kind === "fun") {
      const heading = document.querySelector(".page-head h1");
      const intro = document.querySelector(".page-head p");
      if (heading) heading.textContent = kind === "fun" ? "Развлекательные тесты" : "Тесты по физике";
      if (intro) intro.textContent = "Выберите набор. После отправки ответов вы увидите результат и объяснение каждого вопроса. Вход не нужен.";
      const help = document.querySelector('[aria-labelledby="help-title"]');
      if (help) help.hidden = true;
      const runnerTitle = document.querySelector("#runner-title");
      if (runnerTitle) runnerTitle.textContent = "Выберите тест";
      host.dataset.testKind = kind;
      await loadTestCatalog(host);
      return;
    }
    const testId = params.get("id");
    if (!testId) {
      const state = renderEmpty(host, "Тест не выбран", "Выберите опубликованный тест из каталога.");
      const link = createElement("a", "btn", "Выбрать тест");
      link.href = "/tests";
      state.appendChild(link);
      return;
    }

    renderLoading(host, "Загружаем вопросы.");
    const result = await requestJson(`/api/test/${encodeURIComponent(testId)}`);
    if (result.state === "error") {
      renderError(host, "Вопросы недоступны. Проверьте соединение и попробуйте снова.", () => loadTest(host));
      return;
    }
    if (result.state === "empty" || !result.data) {
      const state = renderEmpty(host, "Тест не найден", "Возможно, он был удалён. Выберите другой тест из каталога.");
      const link = createElement("a", "btn", "Открыть каталог");
      link.href = "/tests";
      state.appendChild(link);
      return;
    }
    renderQuestions(host, result.data);
  }

  async function loadEge(host) {
    renderLoading(host, "Загружаем тренировочные задания.");
    const result = await requestJson("/api/ege");
    if (result.state !== "ok" || !Array.isArray(result.data)) {
      renderError(host, "Задания недоступны. Попробуйте снова.", () => loadEge(host));
      return;
    }
    if (!result.data.length) {
      renderEmpty(host, "Задания пока не опубликованы", "Загляните позже или откройте банк ФИПИ ниже.");
      return;
    }
    clear(host);
    result.data.forEach((task, index) => {
      const card = createElement("article", "panel");
      card.appendChild(createElement("h3", null, `${index + 1}. ${task.topic}`));
      card.appendChild(createElement("p", null, task.prompt));
      const form = createElement("form", "form");
      const label = createElement("label", "form__field", `Ответ (${task.unit})`);
      const input = createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.name = "answer";
      input.maxLength = 64;
      input.required = true;
      input.autocomplete = "off";
      label.appendChild(input);
      form.appendChild(label);
      const button = createElement("button", "btn", "Проверить ответ");
      button.type = "submit";
      form.appendChild(button);
      const notice = createElement("p", "form__notice");
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      form.appendChild(notice);
      const review = createElement("div", "state");
      review.hidden = true;
      review.tabIndex = -1;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        notice.textContent = "Проверяем ответ…";
        review.hidden = true;
        const response = await requestJson("/api/ege/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ task_id: task.id, answer: input.value }),
        });
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (response.state !== "ok" || !response.data) {
          notice.textContent = errorMessage(response, "Ответ не проверен. Проверьте соединение и попробуйте снова.");
          return;
        }
        notice.textContent = response.data.is_correct ? "Верно!" : "Пока неверно. Посмотрите разбор и попробуйте ещё раз.";
        clear(review);
        review.appendChild(createElement("h4", null, "Разбор решения"));
        review.appendChild(createElement("p", null, `Ответ: ${response.data.correct_answer} ${response.data.unit}`));
        review.appendChild(createElement("p", null, response.data.explanation));
        if (/^https:\/\//.test(response.data.source || "")) {
          const source = createElement("a", null, "Учебный источник (на английском)");
          source.href = response.data.source;
          source.target = "_blank";
          source.rel = "noopener noreferrer";
          review.appendChild(source);
        }
        review.hidden = false;
        review.focus();
      });
      input.addEventListener("input", () => {
        review.hidden = true;
        notice.textContent = "";
      });
      card.appendChild(form);
      card.appendChild(review);
      host.appendChild(card);
    });
  }

  function initTest() {
    const catalog = document.querySelector("[data-tests]");
    if (catalog) loadTestCatalog(catalog);
    const host = document.querySelector("[data-test]");
    if (host) {
      loadTest(host);
    }
  }

  /* Календарь */

  function renderCalendar(host, monthDate, events, selectDay, selectedDay) {
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
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = (events || []).filter((event) => event.event_date === date);
      const cell = createElement("button", "calendar__day", String(day) + (dayEvents.length ? " ·" : ""));
      cell.type = "button";
      cell.setAttribute("aria-label", formatDate(date) + (dayEvents.length ? `, событий: ${dayEvents.length}` : ", нет событий"));
      cell.setAttribute("aria-pressed", String(selectedDay === date));
      if (dayEvents.length) cell.classList.add("calendar__day--event");
      if (selectDay) cell.addEventListener("click", () => selectDay(date));
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      if (isToday) {
        cell.classList.add("calendar__day--today");
        cell.setAttribute("aria-current", "date");
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
    let events = [];
    let eventsReady = false;
    let selectedDay = null;
    const list = document.querySelector("[data-events]");
    const previous = document.querySelector("[data-month-previous]");
    const next = document.querySelector("[data-month-next]");

    function paint() {
      renderCalendar(host, current, events, (date) => {
        selectedDay = date;
        paint();
        list.focus();
      }, selectedDay);
      if (!list || !eventsReady) return;
      list.tabIndex = -1;
      const month = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      const selected = events.filter((event) => selectedDay ? event.event_date === selectedDay : event.event_date.startsWith(month));
      if (!selected.length) {
        renderEmpty(list, selectedDay ? "В этот день нет событий" : "В этом месяце нет событий", "Выберите другую дату или следите за новостями проекта.");
        return;
      }
      clear(list);
      selected.forEach((event) => {
        const item = createElement("article", "state");
        item.appendChild(createElement("p", "muted", formatDate(event.event_date)));
        item.appendChild(createElement("h3", null, event.title));
        item.appendChild(createElement("p", null, event.description || ""));
        const source = publicLink(event.source);
        if (source) {
          const link = createElement("a", null, "Источник даты");
          link.href = source;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          item.appendChild(link);
        }
        list.appendChild(item);
      });
    }

    async function loadEvents() {
      renderLoading(list, "Проверяем календарь событий.");
      const requestedYear = current.getFullYear();
      eventsReady = false;
      const result = await requestJson(`/api/calendar?year=${requestedYear}`);
      if (requestedYear !== current.getFullYear()) return;
      if (result.state !== "ok" || !Array.isArray(result.data)) {
        renderError(list, "Не удалось загрузить события.", loadEvents);
        return;
      }
      events = result.data;
      eventsReady = true;
      paint();
    }

    function shift(step) {
      const previousYear = current.getFullYear();
      current = new Date(current.getFullYear(), current.getMonth() + step, 1);
      selectedDay = null;
      if (previousYear !== current.getFullYear() && list) {
        loadEvents();
      }
      paint();
    }

    if (previous) {
      previous.addEventListener("click", () => shift(-1));
    }
    if (next) {
      next.addEventListener("click", () => shift(1));
    }
    renderCalendar(host, current, events);
    if (list) loadEvents();
  }

  function publicLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  async function loadMaterials(host, url, emptyTitle, emptyText, renderItem) {
    renderLoading(host, "Проверяем опубликованные материалы.");
    const result = await requestJson(url);
    const retry = () => loadMaterials(host, url, emptyTitle, emptyText, renderItem);
    if (result.state !== "ok" || !Array.isArray(result.data)) {
      renderError(host, "Не удалось загрузить материалы. Попробуйте снова.", retry);
      return;
    }
    if (!result.data.length) {
      renderEmpty(host, emptyTitle, emptyText);
      return;
    }
    clear(host);
    result.data.forEach((item) => host.appendChild(renderItem(item)));
  }

  function initMaterials() {
    const videos = document.querySelector("[data-videos]");
    if (videos) loadMaterials(videos, "/api/videos", "Видео пока не опубликованы", "Новые записи появятся здесь после публикации.", (video) => {
      const href = publicLink(video.url);
      const item = createElement(href ? "a" : "article", "video-tile");
      if (href) {
        item.href = href;
        item.target = "_blank";
        item.rel = "noopener noreferrer";
        item.setAttribute("aria-label", `${video.title}. Смотреть на исходной площадке, откроется новая вкладка`);
      }
      const cover = (video.images || []).find((value) => /^\/news-media\/[a-f0-9]{64}\.jpg$/.test(value));
      if (cover) {
        const image = createElement("img", "video-tile__cover");
        image.src = cover;
        image.alt = "";
        image.loading = "lazy";
        item.appendChild(image);
      }
      const play = createElement("span", "video-tile__play", "▶");
      play.setAttribute("aria-hidden", "true");
      item.appendChild(play);
      const caption = createElement("div", "video-tile__caption");
      if (video.date) caption.appendChild(createElement("p", "video-tile__date", formatDate(video.date)));
      caption.appendChild(createElement("h3", null, video.title));
      if (video.description) caption.appendChild(createElement("p", "video-tile__description", video.description));
      caption.appendChild(createElement("span", "video-tile__action", href ? "Смотреть ↗" : "Ссылка недоступна"));
      item.appendChild(caption);
      return item;
    });
    const novel = document.querySelector("[data-novel-updates]");
    if (novel) loadMaterials(novel, "/api/novel/updates", "Дневник пока не опубликован", "Новелла в разработке. Новые записи появятся здесь по мере публикации.", (entry) => {
      const item = createElement("article", "state");
      item.appendChild(createElement("p", "muted", formatDate(entry.update_date)));
      item.appendChild(createElement("h3", null, entry.title));
      item.appendChild(createElement("p", null, entry.body || ""));
      return item;
    });
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
    initQuote();
    initAccount();
    initHeaderAvatar();
    initLogin();
    initRegister();
    initPasswordResetRequest();
    initPasswordResetConfirm();
    initTest();
    const ege = document.querySelector("[data-ege]");
    if (ege) loadEge(ege);
    initCalendar();
    initMaterials();
  });
})();
