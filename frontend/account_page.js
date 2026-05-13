document.addEventListener("DOMContentLoaded", function () {
  var box = document.getElementById("account-content");
  if (!box || !window.MosAPI) return;

  if (!window.MosAPI.isLoggedIn()) {
    location.replace("login.html");
    return;
  }

  window.MosAPI
    .me()
    .then(function (user) {
      box.innerHTML =
        "<p style=\"font-size:1.25rem;font-weight:800;margin-bottom:.35rem\">" +
        (user.username || "") +
        "</p>" +
        "<p style=\"opacity:.92;margin-bottom:1rem\">Самый умный физик в мире</p>" +
        "<p><strong>Почта:</strong> " +
        (user.email || "") +
        "</p>" +
        "<p style=\"margin-top:.5rem\"><strong>Пароль:</strong> ••••••••</p>";
    })
    .catch(function () {
      window.MosAPI.logout();
      location.replace("login.html");
    });

  var out = document.getElementById("logout-btn");
  if (out) {
    out.addEventListener("click", function () {
      window.MosAPI.logout();
      location.href = "../index.html";
    });
  }
});
