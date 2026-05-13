document.addEventListener("DOMContentLoaded", function () {
  var el = document.getElementById("calendar-root");
  if (!el || !window.MosAPI) return;
  window.MosAPI
    .getCalendar()
    .then(function (rows) {
      if (!rows || !rows.length) {
        el.innerHTML = "<p>Событий пока нет.</p>";
        return;
      }
      var ul = document.createElement("ul");
      ul.className = "simple-list";
      rows.forEach(function (r) {
        var li = document.createElement("li");
        li.innerHTML =
          "<strong>" +
          (r.event_date || "") +
          "</strong> — " +
          (r.title || "") +
          (r.description ? "<br><span style=\"opacity:.85\">" + r.description + "</span>" : "");
        ul.appendChild(li);
      });
      el.appendChild(ul);
    })
    .catch(function () {
      el.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить календарь.</p>";
    });
});
