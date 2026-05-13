document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("tests-root");
  if (!root || !window.MosAPI) return;

  window.MosAPI
    .getTests()
    .then(function (items) {
      root.innerHTML = "";
      if (!items || !items.length) {
        root.innerHTML = "<p>Тесты скоро появятся.</p>";
        return;
      }
      items.forEach(function (t) {
        var a = document.createElement("a");
        a.className = "test-card-api choice-card";
        a.href = "test_template.html?id=" + encodeURIComponent(t.id);
        a.innerHTML =
          "<strong>" +
          (t.title || "Тест") +
          "</strong><p>" +
          (t.description || "") +
          "</p>";
        root.appendChild(a);
      });
    })
    .catch(function () {
      root.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить список тестов.</p>";
    });
});
