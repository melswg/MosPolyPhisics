(function () {
  function formatDate(value) {
    if (!value) return "Дата не указана";
    var parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var date = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  function createState(kind, title, message) {
    var state = document.createElement("article");
    state.className = "news-card";
    state.setAttribute("role", kind === "error" ? "alert" : "status");
    var label = document.createElement("p");
    label.className = "news-card__date";
    label.textContent = kind === "loading" ? "Загрузка" : "Лента проекта";
    var heading = document.createElement("h2");
    heading.className = "news-card__title";
    heading.textContent = title;
    var text = document.createElement("p");
    text.className = "news-card__body";
    text.textContent = message;
    state.append(label, heading, text);
    return state;
  }

  function createNewsCard(item) {
    var card = document.createElement("article");
    card.className = "news-card";
    var date = document.createElement("time");
    date.className = "news-card__date";
    date.dateTime = item.date || "";
    date.textContent = formatDate(item.date);
    var title = document.createElement("h2");
    title.className = "news-card__title";
    title.textContent = item.title || "Без заголовка";
    var body = document.createElement("p");
    body.className = "news-card__body";
    body.textContent = item.content || "Содержание не указано.";
    card.append(date, title, body);
    return card;
  }

  function loadNews(root) {
    root.setAttribute("aria-busy", "true");
    window.MosAPI.getNews().then(function (items) {
      root.replaceChildren();
      if (!Array.isArray(items) || !items.length) {
        root.appendChild(createState("empty", "Новостей пока нет", "Когда команда опубликует подтверждённое обновление, оно появится здесь."));
        return;
      }
      items.forEach(function (item) { root.appendChild(createNewsCard(item)); });
    }).catch(function () {
      root.replaceChildren();
      var state = createState("error", "Не удалось загрузить новости", "Проверьте соединение и попробуйте ещё раз.");
      var retry = document.createElement("button");
      retry.className = "btn-primary";
      retry.type = "button";
      retry.textContent = "Повторить";
      retry.addEventListener("click", function () {
        root.replaceChildren(createState("loading", "Загружаем новости", "Это займёт несколько секунд."));
        loadNews(root);
      });
      state.appendChild(retry);
      root.appendChild(state);
    }).finally(function () { root.setAttribute("aria-busy", "false"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("news-root");
    if (!root) return;
    if (!window.MosAPI) {
      root.replaceChildren(createState("error", "Новости недоступны", "Клиент API не загрузился. Обновите страницу."));
      root.setAttribute("aria-busy", "false");
      return;
    }
    loadNews(root);
  });
})();
