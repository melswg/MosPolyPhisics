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
        "<p><strong>Имя:</strong> " +
        (user.username || "") +
        "</p>" +
        "<p><strong>Email:</strong> " +
        (user.email || "") +
        "</p>" +
        "<p><strong>ID:</strong> " +
        (user.id || "") +
        "</p>";
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
