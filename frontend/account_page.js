document.addEventListener("DOMContentLoaded", function () {
  var box = document.getElementById("account-content");
  var memberProfile = document.getElementById("account-member-profile");
  var memberMascot = document.getElementById("account-member-mascot");
  var guest = document.getElementById("account-guest");
  var status = document.getElementById("account-status");
  var out = document.getElementById("logout-btn");
  if (!box || !memberProfile || !memberMascot || !guest || !status || !out || !window.MosAPI) return;

  window.MosAPI
    .me()
    .then(function (user) {
      status.hidden = true;
      guest.hidden = true;
      memberProfile.hidden = false;
      memberMascot.hidden = false;
      out.hidden = false;
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
    .catch(function (error) {
      status.hidden = true;
      memberProfile.hidden = true;
      memberMascot.hidden = true;
      out.hidden = true;
      if (error && error.status === 401) {
        guest.hidden = false;
        return;
      }
      guest.hidden = true;
      status.hidden = false;
      status.textContent = "Не удалось загрузить аккаунт. Обновите страницу и попробуйте ещё раз.";
    });

  out.addEventListener("click", function () {
    out.disabled = true;
    window.MosAPI.logout().finally(function () {
      location.href = "../index.html";
    });
  });
});
