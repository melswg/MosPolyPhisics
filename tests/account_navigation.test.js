const fs = require("fs");
const vm = require("vm");

function classList() {
  const names = new Set();
  return {
    add(...items) { items.forEach((item) => names.add(item)); },
    remove(...items) { items.forEach((item) => names.delete(item)); },
    toggle(item, force) {
      if (force === undefined ? !names.has(item) : force) names.add(item);
      else names.delete(item);
    },
    contains(item) { return names.has(item); },
  };
}

function element(tagName = "div") {
  return {
    tagName,
    children: [],
    classList: classList(),
    dataset: {},
    disabled: false,
    href: "",
    textContent: "",
    get firstChild() { return this.children[0] || null; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((item) => item !== child); },
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
    toggleAttribute(name, force) { if (force) this[name] = ""; else delete this[name]; },
    addEventListener(name, callback) { this[`on${name}`] = callback; },
    querySelector() { return null; },
  };
}

function response(status, data) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(data === null ? "" : JSON.stringify(data)),
  });
}

async function renderAccount(userResponse) {
  const host = element();
  let ready;
  let redirectedTo = "";
  const context = {
    URLSearchParams,
    Intl,
    fetch(url, options = {}) {
      if (url === "/api/user/me") return userResponse;
      if (url === "/api/logout" && options.headers["X-CSRF-Token"] === "csrf") {
        return response(204, null);
      }
      return response(500, { detail: "unexpected request" });
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
      documentElement: { dataset: { theme: "dark" } },
      addEventListener(name, callback) { if (name === "DOMContentLoaded") ready = callback; },
      createElement: element,
      createTextNode(text) { return { textContent: text }; },
      getElementById() { return null; },
      querySelector(selector) { return selector === "[data-account]" ? host : null; },
      querySelectorAll() { return []; },
    },
  };
  const location = {
    search: "",
    get href() { return redirectedTo; },
    set href(value) { redirectedTo = value; },
  };
  context.window = { location };
  vm.runInNewContext(fs.readFileSync("frontend/js/site.js", "utf8"), context);
  ready();
  await new Promise((resolve) => setImmediate(resolve));
  return { host, redirectedTo: () => redirectedTo };
}

function allText(node) {
  return [node.textContent || ""]
    .concat((node.children || []).flatMap(allText))
    .join(" ");
}

function findByTag(node, tagName) {
  if (node.tagName === tagName) return node;
  for (const child of node.children || []) {
    const found = findByTag(child, tagName);
    if (found) return found;
  }
  return null;
}

(async () => {
  const guest = await renderAccount(response(401, { detail: "Требуется авторизация" }));
  const guestText = allText(guest.host);
  if (!guestText.includes("Вы не вошли") || !guestText.includes("Зарегистрироваться")) {
    throw new Error("Гостю не показан выбор входа и регистрации");
  }

  const member = await renderAccount(response(200, {
    username: "student",
    email: "student@example.org",
    csrf_token: "csrf",
  }));
  const memberText = allText(member.host);
  if (!memberText.includes("student") || !memberText.includes("student@example.org")) {
    throw new Error("Вошедшему пользователю не показан кабинет");
  }
  const logout = findByTag(member.host, "button");
  if (!logout || !logout.onclick) throw new Error("В кабинете нет рабочей кнопки выхода");
  await logout.onclick();
  if (member.redirectedTo() !== "/") throw new Error("После выхода не открывается главная");

  const failed = await renderAccount(response(500, { detail: "Ошибка" }));
  if (!allText(failed.host).includes("Не удалось проверить вход")) {
    throw new Error("Техническая ошибка выдана за отсутствие входа");
  }

  console.log("account navigation states ok");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
