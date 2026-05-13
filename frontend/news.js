document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("news-root");
  if (!root || !window.MosAPI) return;

  window.MosAPI
    .getNews()
    .then(function (items) {
      root.innerHTML = "";
      if (!items || !items.length) {
        root.innerHTML = "<p>Новостей пока нет.</p>";
        return;
      }
      items.forEach(function (n) {
        var card = document.createElement("article");
        card.className = "news-card";
        card.innerHTML =
          '<p class="news-card__date"></p><h2 class="news-card__title"></h2><div class="news-card__body"></div>';
        card.querySelector(".news-card__date").textContent = n.date || "";
        card.querySelector(".news-card__title").textContent = n.title || "";
        card.querySelector(".news-card__body").textContent = n.content || "";
        root.appendChild(card);
      });
    })
    .catch(function () {
      root.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить новости.</p>";
    });
});
