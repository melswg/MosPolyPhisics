document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("login-form");
  var msg = document.getElementById("login-msg");
  if (!form || !window.MosAPI) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    var ident = document.getElementById("login-ident").value.trim();
    var pass = document.getElementById("login-pass").value;
    window.MosAPI
      .login(ident, pass)
      .then(function (data) {
        if (data.access_token) window.MosAPI.setToken(data.access_token);
        msg.className = "form-msg form-msg--ok";
        msg.textContent = "Вход выполнен, перенаправление…";
        setTimeout(function () {
          location.href = "account.html";
        }, 600);
      })
      .catch(function (err) {
        msg.className = "form-msg form-msg--error";
        msg.textContent = err.message || "Ошибка входа";
      });
  });
});
