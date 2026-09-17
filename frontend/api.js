/**
 * Клиент API МосПолиФизикс (тот же origin, что и FastAPI со статикой).
 */
(function () {
  const API_BASE = "";
  var csrfToken = sessionStorage.getItem("csrf_token") || "";

  function rememberCsrf(data) {
    if (data && data.csrf_token) {
      csrfToken = data.csrf_token;
      sessionStorage.setItem("csrf_token", csrfToken);
    }
    return data;
  }

  async function apiFetch(path, options) {
    options = options || {};
    const headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    if (
      options.body &&
      typeof options.body === "string" &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }
    if (options.csrf && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
    const res = await fetch(
      API_BASE + path,
      Object.assign({}, options, { headers: headers, credentials: "same-origin" })
    );
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { detail: text || "Ошибка разбора ответа" };
    }
    if (!res.ok) {
      var detail = data && data.detail;
      var msg;
      if (typeof detail === "string") msg = detail;
      else if (Array.isArray(detail))
        msg = detail
          .map(function (e) {
            return (e && (e.msg || e.message)) || JSON.stringify(e);
          })
          .join("; ");
      else msg = (data && data.message) || res.statusText || "Ошибка запроса";
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.MosAPI = {
    getQuote: function () {
      return apiFetch("/api/quote", { method: "GET", auth: false });
    },
    getNews: function () {
      return apiFetch("/api/news", { method: "GET", auth: false });
    },
    getTests: function () {
      return apiFetch("/api/tests", { method: "GET", auth: false });
    },
    getTest: function (id) {
      return apiFetch("/api/test/" + encodeURIComponent(id), { method: "GET", auth: false });
    },
    submitTest: function (testId, answers) {
      return apiFetch("/api/test/submit", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ test_id: testId, answers: answers }),
      });
    },
    getCalendar: function () {
      return apiFetch("/api/calendar", { method: "GET", auth: false });
    },
    getVideos: function () {
      return apiFetch("/api/videos", { method: "GET", auth: false });
    },
    getNovelUpdates: function () {
      return apiFetch("/api/novel/updates", { method: "GET", auth: false });
    },
    register: function (username, email, password) {
      return apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ username: username, email: email, password: password }),
      }).then(rememberCsrf);
    },
    login: function (usernameOrEmail, password) {
      return apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: usernameOrEmail, password: password }),
      }).then(rememberCsrf);
    },
    me: function () {
      return apiFetch("/api/user/me", { method: "GET" }).then(rememberCsrf);
    },
    requestPasswordReset: function (email) {
      return apiFetch("/api/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: email }),
      });
    },
    confirmPasswordReset: function (token, newPassword) {
      return apiFetch("/api/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token: token, new_password: newPassword }),
      });
    },
    logout: function () {
      return apiFetch("/api/logout", { method: "POST", csrf: true }).finally(function () {
        csrfToken = "";
        sessionStorage.removeItem("csrf_token");
        localStorage.removeItem("access_token");
      });
    },
  };
})();
