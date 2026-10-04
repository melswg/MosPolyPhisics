const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

async function screen({ token = "preview-token", status = 200, mismatch = false } = {}) {
  const notice = { textContent: "", className: "", classList: { remove() {}, add() {} } };
  const button = { disabled: false, hidden: false, toggleAttribute() {} };
  const login = { textContent: "", classList: { remove() {} }, focus() { this.focused = true; } };
  const fields = [{ hidden: false }, { hidden: false }];
  const form = {
    elements: {
      token: { value: "" }, new_password: { value: "newphysics2026" },
      new_password_repeat: { value: mismatch ? "different2026" : "newphysics2026" },
    },
    querySelector(selector) {
      if (selector === ".form__notice") return notice;
      if (selector === "[data-reset-login]") return login;
      return button;
    },
    querySelectorAll() { return fields; },
    addEventListener(name, callback) { this[name] = callback; },
  };
  let ready;
  const calls = [];
  const history = { replaceState(_state, _title, path) { this.path = path; } };
  const context = {
    URLSearchParams, Intl,
    document: {
      addEventListener(name, callback) { if (name === "DOMContentLoaded") ready = callback; },
      getElementById() { return null; }, querySelectorAll() { return []; },
      querySelector(selector) { return selector === "[data-password-reset-confirm]" ? form : null; },
    },
    window: { history, location: { hash: token ? `#token=${token}` : "", search: "", pathname: "/password-reset/confirm" } },
    async fetch(url, options) {
      calls.push({ url, body: JSON.parse(options.body) });
      return { status, ok: status === 200, text: async () => JSON.stringify(
        status === 200 ? { message: "Пароль изменён" } : { detail: "Ссылка недействительна" }
      ) };
    },
  };
  vm.runInNewContext(fs.readFileSync("frontend/js/site.js", "utf8"), context);
  ready();
  await form.submit({ preventDefault() {} });
  return { calls, form, notice, button, login, fields, history };
}

(async () => {
  const success = await screen();
  assert.equal(success.history.path, "/password-reset/confirm");
  assert.equal(success.calls[0].body.token, "preview-token");
  assert.equal(success.form.elements.new_password.value, "");
  assert.equal(success.form.elements.token.value, "");
  assert(success.fields.every((field) => field.hidden));
  assert(success.button.hidden && success.login.focused);
  assert.equal(success.login.textContent, "Войти с новым паролем");
  const mismatch = await screen({ mismatch: true });
  assert.equal(mismatch.calls.length, 0);
  assert.equal(mismatch.notice.textContent, "Пароли не совпадают.");
  const invalid = await screen({ status: 400 });
  assert(invalid.button.disabled);
  assert.equal(invalid.form.elements.new_password.value, "newphysics2026");
  const missing = await screen({ token: "" });
  assert(missing.button.disabled);
  assert.equal(missing.calls.length, 0);
  const failure = await screen({ status: 503 });
  assert(!failure.button.disabled);
  assert.equal(failure.form.elements.new_password.value, "newphysics2026");
  console.log("password reset UI states ok");
})().catch((error) => { console.error(error); process.exitCode = 1; });
