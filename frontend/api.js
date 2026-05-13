/**
 * Клиент API МосПолиФизикс (тот же origin, что и FastAPI со статикой).
 */
(function () {
  const API_BASE = "";

  function authHeader() {
    const t = localStorage.getItem("access_token");
    return t ? { Authorization: "Bearer " + t } : {};
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
    if (options.auth !== false) {
      Object.assign(headers, authHeader());
    }
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
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
        auth: false,
        body: JSON.stringify({ username: username, email: email, password: password }),
      });
    },
    login: function (usernameOrEmail, password) {
      return apiFetch("/api/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ username: usernameOrEmail, password: password }),
      });
    },
    me: function () {
      return apiFetch("/api/user/me", { method: "GET", auth: true });
    },
    setToken: function (token) {
      if (token) localStorage.setItem("access_token", token);
      else localStorage.removeItem("access_token");
    },
    logout: function () {
      localStorage.removeItem("access_token");
    },
    isLoggedIn: function () {
      return !!localStorage.getItem("access_token");
    },
  };
})();
