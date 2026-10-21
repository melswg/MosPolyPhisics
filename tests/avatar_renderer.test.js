const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function element() {
  return {
    attributes: {}, children: [], classList: { add() {} },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { this.attributes[key] = String(value); },
  };
}
const context = { window: {}, document: { createElementNS() { return element(); } } };
vm.runInNewContext(fs.readFileSync("frontend/js/avatar.js", "utf8"), context);
function nodes(root) { return [root, ...root.children.flatMap(nodes)]; }
const expected = new Set(["hoodie", "labcoat", "happy", "wink", "wow", "graduate", "space"]);
const found = new Set();
for (const face of ["smile", "happy", "wink", "wow"]) {
  for (const outfit of ["none", "hoodie", "labcoat"]) {
    for (const hat of ["none", "graduate", "space"]) {
      const host = element();
      const config = { face, outfit, hat, color: "gold", accessory: "glasses" };
      context.window.MosAvatar.render(host, config);
      assert.equal(host.children.length, 1);
      assert.equal(host.children[0].attributes.viewBox, "240 220 520 520");
      const images = nodes(host).filter((node) => node.attributes.href);
      const names = images.map((node) => node.attributes.href.match(/^\/assets\/avatar\/(\w+)\.png$/)?.[1]);
      assert.ok(names.every((name) => expected.has(name)));
      if (face !== "smile") assert.ok(names.includes(face));
      if (outfit !== "none") assert.ok(names.includes(outfit));
      if (hat !== "none") assert.ok(names.includes(hat));
      names.forEach((name) => found.add(name));
      // Повторный рендер заменяет слои, не накапливая старую основу с орбитами
      context.window.MosAvatar.render(host, config);
      assert.equal(host.children.length, 1);
      assert.ok(!JSON.stringify(host).includes("mas.svg"));
    }
  }
}
assert.deepEqual(found, expected);
const host = element();
context.window.MosAvatar.render(host, { face: "../../bad", outfit: "https://example.org", hat: "<svg>" });
assert.ok(nodes(host).every((node) => !node.attributes.href));
console.log("Avatar layers and orbit-free base checks passed");
