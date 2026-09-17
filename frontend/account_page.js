document.addEventListener("DOMContentLoaded", function () {
  var box = document.getElementById("account-content");
  if (!box || !window.MosAPI) return;

  window.MosAPI
    .me()
    .then(function (user) {
      box.textContent = "";
      var name = document.createElement("p");
      name.style.cssText = "font-size:1.25rem;font-weight:800;margin-bottom:1rem";
      name.textContent = user.username || "";
      var email = document.createElement("p");
      var label = document.createElement("strong");
      label.textContent = "Почта: ";
      email.appendChild(label);
      email.appendChild(document.createTextNode(user.email || ""));
      box.appendChild(name);
      box.appendChild(email);
    })
    .catch(function () {
      window.MosAPI.logout().finally(function () {
        location.replace("login.html");
      });
    });

  var out = document.getElementById("logout-btn");
  if (out) {
    out.addEventListener("click", function () {
      out.disabled = true;
      window.MosAPI.logout().finally(function () {
        location.href = "../index.html";
      });
    });
  }
});
