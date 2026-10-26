// Run from repository root. Uses the existing renderer without changing site assets.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');
const folder = __dirname;
function element(tag) {
  return { tag, attributes: {}, children: [], classList: { add() {} },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { this.attributes[key] = String(value); } };
}
const context = { window: {}, document: { createElementNS(ns, tag) { return element(tag); } } };
vm.runInNewContext(fs.readFileSync('frontend/js/avatar.js', 'utf8'), context);
function serialize(node, hoodie) {
  const attrs = { ...node.attributes };
  if (attrs.href) {
    const assetPath=attrs.href.split('?')[0];
    const file = hoodie && assetPath.endsWith('/hoodie.png') ? hoodie : `.${assetPath}`;
    attrs.href = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  }
  if (node.tag === 'svg') attrs.xmlns = 'http://www.w3.org/2000/svg';
  return `<${node.tag} ${Object.entries(attrs).map(([k,v]) => `${k}="${v}"`).join(' ')}>${node.children.map(n => serialize(n, hoodie)).join('')}</${node.tag}>`;
}
function svg(config, orbits = false, hoodie) {
  const host = element('div');
  context.window.MosAvatar.render(host, { color: 'purple', face: 'smile', outfit: 'none', accessory: 'none', hat: 'none', ...config }, { orbits });
  return serialize(host.children[0], hoodie);
}
async function main() {
  await sharp(Buffer.from(svg({}))).resize(1040,1040).png().toFile(path.join(folder,'body-reference.png'));
  await sharp(Buffer.from(svg({outfit:'hoodie'}))).resize(1040,1040).png().toFile(path.join(folder,'before.png'));
  const hoodie = path.join(folder,'hoodie-v2.png');
  if (!fs.existsSync(hoodie)) return;
  for (const color of ['purple','blue','mint','pink','gold']) {
    await sharp(Buffer.from(svg({color,outfit:'hoodie'}, false, hoodie))).resize(520,520).png().toFile(path.join(folder,`${color}.png`));
  }
  const data = fs.readFileSync(hoodie).toString('base64');
  let renderer = fs.readFileSync('frontend/js/avatar.js','utf8').replace('href: `/assets/avatar/${name}.png?v=20261024`', 'href: name === "hoodie" ? "data:image/png;base64,'+data+'" : `/assets/avatar/${name}.png?v=20261024`');
  fs.writeFileSync(path.join(folder,'renderer-review.js'), renderer);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
