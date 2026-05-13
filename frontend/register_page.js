document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("register-form");
  var msg = document.getElementById("register-msg");
  if (!form || !window.MosAPI) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    var username = document.getElementById("reg-user").value.trim();
    var email = document.getElementById("reg-email").value.trim();
    var pass = document.getElementById("reg-pass").value;
    window.MosAPI
      .register(username, email, pass)
      .then(function (data) {
        if (data.access_token) window.MosAPI.setToken(data.access_token);
        msg.className = "form-msg form-msg--ok";
        msg.textContent = "Аккаунт создан. Перенаправление…";
        setTimeout(function () {
          location.href = "account.html";
        }, 600);
      })
      .catch(function (err) {
        msg.className = "form-msg form-msg--error";
        msg.textContent = err.message || "Ошибка регистрации";
      });
  });
});
