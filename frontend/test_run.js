document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("test-runner-root");
  var params = new URLSearchParams(location.search);
  var testId = parseInt(params.get("id"), 10);
  if (!root || !window.MosAPI || !testId) {
    if (root) root.innerHTML = "<p>Укажите тест: <code>test_template.html?id=1</code></p>";
    return;
  }

  var answers = {};

  window.MosAPI
    .getTest(testId)
    .then(function (data) {
      document.getElementById("test-title").textContent = data.title || "Тест";
      root.innerHTML = "";
      (data.questions || []).forEach(function (q, idx) {
        var block = document.createElement("div");
        block.className = "question-block";
        var h = document.createElement("h3");
        h.textContent = idx + 1 + ". " + (q.prompt || "");
        block.appendChild(h);
        (q.options || []).forEach(function (optText, optIdx) {
          var id = "q" + q.id + "_" + optIdx;
          var lab = document.createElement("label");
          lab.className = "opt";
          lab.setAttribute("for", id);
          var inp = document.createElement("input");
          inp.type = "radio";
          inp.name = "q" + q.id;
          inp.id = id;
          inp.value = String(optIdx);
          inp.addEventListener("change", function () {
            answers[q.id] = optIdx;
          });
          lab.appendChild(inp);
          lab.appendChild(document.createTextNode(" " + optText));
          block.appendChild(lab);
        });
        root.appendChild(block);
      });

      var btnRow = document.createElement("div");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-primary";
      btn.textContent = "Проверить ответы";
      btn.addEventListener("click", function () {
        var keys = Object.keys(answers);
        if (keys.length < (data.questions || []).length) {
          alert("Ответьте на все вопросы.");
          return;
        }
        var payload = {};
        keys.forEach(function (k) {
          payload[String(k)] = answers[k];
        });
        window.MosAPI
          .submitTest(testId, payload)
          .then(function (res) {
            var banner = document.getElementById("test-result");
            banner.className = "result-banner";
            banner.style.display = "block";
            banner.textContent =
              "Результат: " + res.correct + " из " + res.total + " (" + res.percent + "%)";
          })
          .catch(function (e) {
            alert(e.message || "Ошибка отправки");
          });
      });
      btnRow.appendChild(btn);
      root.appendChild(btnRow);
    })
    .catch(function () {
      root.innerHTML = "<p class=\"form-msg form-msg--error\">Тест не найден или ошибка сети.</p>";
    });
});
