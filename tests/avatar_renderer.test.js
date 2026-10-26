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
const expected = new Set(["hoodie", "labcoat", "happy", "wink", "wow", "graduate", "space", "glasses", "goggles", "headphones"]);
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
      const names = images.map((node) => node.attributes.href.match(/^\/assets\/avatar\/(\w+)\.png\?v=20261024$/)?.[1]);
      assert.ok(names.every((name) => expected.has(name)));
      if (face !== "smile") assert.ok(names.includes(face));
      if (outfit !== "none") assert.equal(names.includes(outfit), hat !== "space");
      if (hat !== "none") assert.ok(names.includes(hat));
      names.forEach((name) => found.add(name));
      // Повторный рендер заменяет слои, не накапливая старую основу с орбитами
      context.window.MosAvatar.render(host, config);
      assert.equal(host.children.length, 1);
      assert.ok(!JSON.stringify(host).includes("mas.svg"));
    }
  }
}
for (const color of ["purple", "blue", "mint", "pink", "gold"]) {
  for (const accessory of ["none", "glasses", "goggles", "headphones"]) {
    for (const hat of ["none", "graduate", "space"]) {
      const config = { color, face: "wow", outfit: "hoodie", accessory, hat };
      const saved = JSON.stringify(config);
      const host = element();
      context.window.MosAvatar.render(host, config);
      const images = nodes(host).filter(node => node.attributes.href);
      const names = images.map(node => node.attributes.href.split("/").pop().split(".png")[0]);
      names.forEach(name => found.add(name));
      assert.equal(names.includes("headphones"), accessory === "headphones" && hat !== "space");
      if (["glasses", "goggles"].includes(accessory)) assert.ok(names.includes(accessory));
      assert.ok(images.every(node => !node.attributes.transform));
      assert.equal(JSON.stringify(config), saved, "Rendering a suit must preserve the user's choices");
      if (hat === "space") {
        assert.ok(!names.includes("hoodie"));
        context.window.MosAvatar.render(host, { ...config, hat: "none" });
        const restored = nodes(host).filter(node => node.attributes.href).map(node => node.attributes.href);
        assert.ok(restored.includes("/assets/avatar/hoodie.png?v=20261024"));
        if (accessory === "headphones") assert.ok(restored.includes("/assets/avatar/headphones.png?v=20261024"));
      }
    }
  }
}
assert.deepEqual(found, expected);
const preview = element();
context.window.MosAvatar.render(preview, { color: "gold", outfit: "hoodie" }, { orbits: true });
assert.equal(preview.children[0].attributes.viewBox, "0 0 1000 1000");
assert.equal(nodes(preview).filter((node) => "data-orbits" in node.attributes).length, 1);
const miniature = element();
context.window.MosAvatar.render(miniature, { color: "gold", outfit: "hoodie" });
assert.equal(nodes(miniature).filter((node) => "data-orbits" in node.attributes).length, 0);
const host = element();
context.window.MosAvatar.render(host, { face: "../../bad", outfit: "https://example.org", hat: "<svg>" });
assert.ok(nodes(host).every((node) => !node.attributes.href));
console.log("Avatar layers and orbit-free base checks passed");
