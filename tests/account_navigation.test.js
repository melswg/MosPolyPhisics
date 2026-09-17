const fs = require("fs");
const vm = require("vm");

function element(tagName) {
  return {
    tagName: tagName || "div",
    children: [],
    disabled: false,
    href: "",
    style: {},
    textContent: "",
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
  };
}

async function renderAccount(meResult) {
  const box = element("div");
  const logout = element("button");
  const memberProfile = element("div");
  const memberMascot = element("div");
  const guest = element("div");
  const status = element("div");
  memberProfile.hidden = true;
  memberMascot.hidden = true;
  guest.hidden = true;
  status.hidden = false;
  logout.hidden = true;
  let ready;
  let redirectedTo = "";
  const context = {
    document: {
      addEventListener(_name, callback) {
        ready = callback;
      },
      createElement: element,
      createTextNode(text) {
        return { textContent: text };
      },
      getElementById(id) {
        return {
          "account-content": box,
          "account-member-profile": memberProfile,
          "account-member-mascot": memberMascot,
          "account-guest": guest,
          "account-status": status,
          "logout-btn": logout,
        }[id] || null;
      },
    },
    location: {
      href: "",
      replace(url) {
        redirectedTo = url;
      },
    },
    window: {
      MosAPI: {
        me() {
          return meResult;
        },
        logout() {
          return Promise.resolve();
        },
      },
    },
  };
  vm.runInNewContext(fs.readFileSync("frontend/account_page.js", "utf8"), context);
  ready();
  await new Promise((resolve) => setImmediate(resolve));
  return { box, guest, logout, memberProfile, redirectedTo, status };
}

function allText(node) {
  return [node.textContent || ""]
    .concat((node.children || []).flatMap(allText))
    .join(" ");
}

(async () => {
  const guest = await renderAccount(Promise.reject({ status: 401 }));
  if (guest.redirectedTo) throw new Error("Гость был молча перенаправлен: " + guest.redirectedTo);
  if (guest.guest.hidden) throw new Error("Гостю не показан выбор входа и регистрации");
  if (!guest.logout.hidden) throw new Error("Гостю показана кнопка выхода");

  const member = await renderAccount(
    Promise.resolve({ username: "student", email: "student@example.org" })
  );
  const memberText = allText(member.box);
  if (!memberText.includes("student") || !memberText.includes("student@example.org")) {
    throw new Error("Вошедшему пользователю не показан кабинет");
  }
  if (member.memberProfile.hidden) throw new Error("Вошедшему пользователю скрыт кабинет");
  if (member.logout.hidden) throw new Error("Вошедшему пользователю недоступен выход");

  const failed = await renderAccount(Promise.reject({ status: 500 }));
  if (failed.status.hidden || !failed.status.textContent.includes("Не удалось")) {
    throw new Error("Техническая ошибка выдана за отсутствие входа");
  }

  console.log("account navigation states ok");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
