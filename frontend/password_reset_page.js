document.addEventListener("DOMContentLoaded", function () {
  var requestForm = document.getElementById("reset-request-form");
  var confirmForm = document.getElementById("reset-confirm-form");
  if (!window.MosAPI) return;

  if (requestForm) {
    requestForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var message = document.getElementById("reset-request-msg");
      var button = requestForm.querySelector("button[type='submit']");
      button.disabled = true;
      message.textContent = "Отправляем…";
      window.MosAPI
        .requestPasswordReset(document.getElementById("reset-email").value.trim())
        .then(function (data) {
          message.className = "form-msg form-msg--ok";
          message.textContent = data.message;
          requestForm.reset();
        })
        .catch(function (error) {
          message.className = "form-msg form-msg--error";
          message.textContent = error.message || "Не удалось отправить запрос";
        })
        .finally(function () {
          button.disabled = false;
        });
    });
  }

  if (confirmForm) {
    var token = new URLSearchParams(location.search).get("token") || "";
    var confirmMessage = document.getElementById("reset-confirm-msg");
    if (!token) {
      confirmMessage.className = "form-msg form-msg--error";
      confirmMessage.textContent = "В ссылке отсутствует токен восстановления";
      confirmForm.querySelector("button[type='submit']").disabled = true;
      return;
    }
    confirmForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var button = confirmForm.querySelector("button[type='submit']");
      button.disabled = true;
      confirmMessage.textContent = "Сохраняем…";
      window.MosAPI
        .confirmPasswordReset(token, document.getElementById("reset-password").value)
        .then(function (data) {
          confirmMessage.className = "form-msg form-msg--ok";
          confirmMessage.textContent = data.message;
          setTimeout(function () {
            location.href = "login.html";
          }, 900);
        })
        .catch(function (error) {
          confirmMessage.className = "form-msg form-msg--error";
          confirmMessage.textContent = error.message || "Не удалось изменить пароль";
          button.disabled = false;
        });
    });
  }
});
