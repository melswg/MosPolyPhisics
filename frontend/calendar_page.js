document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("calendar-root");
  if (!root || !window.MosAPI) return;

  var accentList = document.getElementById("calendar-accent-events");
  var dayNum = document.getElementById("cal-day-num");
  var dayWeek = document.getElementById("cal-weekday");

  function weekdayRu(d) {
    var names = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return names[d.getDay()] || "";
  }

  window.MosAPI
    .getCalendar()
    .then(function (rows) {
      root.innerHTML = "";
      if (!rows || !rows.length) {
        root.innerHTML = "<p>Событий пока нет.</p>";
        if (accentList) accentList.innerHTML = "<li>Нет данных</li>";
        return;
      }
      var first = rows[0];
      var parts = (first.event_date || "").split("-");
      if (dayNum && parts.length >= 3) dayNum.textContent = String(parseInt(parts[2], 10));
      if (dayWeek) {
        try {
          var dt = new Date(first.event_date + "T12:00:00");
          dayWeek.textContent = weekdayRu(dt);
        } catch (_) {
          dayWeek.textContent = "";
        }
      }
      if (accentList) {
        accentList.innerHTML = "";
        rows.slice(0, 4).forEach(function (r) {
          var li = document.createElement("li");
          li.textContent = (r.title || "") + (r.description ? " — " + r.description : "");
          accentList.appendChild(li);
        });
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
      root.appendChild(ul);
    })
    .catch(function () {
      root.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить календарь.</p>";
    });
});
