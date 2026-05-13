document.addEventListener("DOMContentLoaded", function () {
  var el = document.getElementById("novel-updates-root");
  if (!el || !window.MosAPI) return;
  window.MosAPI
    .getNovelUpdates()
    .then(function (rows) {
      if (!rows || !rows.length) {
        el.innerHTML = "<p>Записей дневника пока нет.</p>";
        return;
      }
      var ul = document.createElement("ul");
      ul.className = "simple-list";
      rows.forEach(function (r) {
        var li = document.createElement("li");
        li.innerHTML =
          "<strong>" +
          (r.update_date || "") +
          " — " +
          (r.title || "") +
          "</strong>" +
          (r.body ? "<p style=\"margin-top:.35rem\">" + r.body + "</p>" : "");
        ul.appendChild(li);
      });
      el.appendChild(ul);
    })
    .catch(function () {
      el.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить обновления.</p>";
    });
});
