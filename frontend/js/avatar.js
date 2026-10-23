/* Симплик: общие слои для предпросмотра и аватара в шапке. */
(function () {
  "use strict";

  const hues = { purple: 0, blue: -95, mint: -135, pink: 45, gold: 115 };
  let renderId = 0;

  function shape(parent, tag, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    parent.appendChild(element);
    return element;
  }

  function render(host, config, { orbits = false } = {}) {
    host.replaceChildren();
    host.classList.add("simplik");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", orbits ? "0 0 1000 1000" : "240 220 520 520");
    svg.setAttribute("aria-hidden", "true");
    host.appendChild(svg);
    const skinId = `simplik-skin-${renderId++}`;
    const defs = shape(svg, "defs", {});
    const gradient = shape(defs, "radialGradient", { id: skinId, cx: ".7", cy: ".3", r: ".85" });
    shape(gradient, "stop", { offset: 0, "stop-color": "#D9A3EF" });
    shape(gradient, "stop", { offset: .55, "stop-color": "#B472CF" });
    shape(gradient, "stop", { offset: 1, "stop-color": "#713E91" });
    // Орбиты рисуются отдельно только в большом предпросмотре
    if (orbits) {
      const rings = shape(svg, "g", { "data-orbits": "", fill: "none", stroke: "#B483D1", "stroke-width": 6, style: `filter:hue-rotate(${hues[config.color] || 0}deg)` });
      [0, 60, -60].forEach((angle) => {
        const ring = shape(rings, "g", { transform: `rotate(${angle} 500 490)` });
        shape(ring, "ellipse", { cx: 500, cy: 490, rx: 390, ry: 135 });
        shape(ring, "circle", { cx: 890, cy: 490, r: 13, fill: "#B483D1", stroke: "none" });
      });
    }
    shape(svg, "circle", { cx: 500, cy: 490, r: 180, fill: `url(#${skinId})`, style: `filter:hue-rotate(${hues[config.color] || 0}deg)` });

    function layer(name, attributes = {}) {
      shape(svg, "image", { href: `/assets/avatar/${name}.png`, x: 0, y: 0, width: 1000, height: 1000, ...attributes });
    }

    if (config.outfit === "labcoat" || config.outfit === "hoodie") layer(config.outfit);
    if (["happy", "wink", "wow"].includes(config.face)) {
      layer(config.face);
    } else {
      [444, 556].forEach((x) => {
        shape(svg, "ellipse", { cx: x, cy: 491, rx: 25, ry: 35, fill: "#252035" });
        shape(svg, "ellipse", { cx: x - 8, cy: 480, rx: 5, ry: 11, fill: "#FFFFFF", opacity: .8 });
        shape(svg, "circle", { cx: x + 10, cy: 481, r: 4, fill: "#D9A570" });
      });
      shape(svg, "path", { d: "M483 548Q500 567 517 548", fill: "none", stroke: "#252035", "stroke-width": 6, "stroke-linecap": "round" });
    }

    if (config.accessory === "glasses" || config.accessory === "goggles") {
      const goggles = config.accessory === "goggles";
      [444, 556].forEach((x) => shape(svg, "rect", { x: x - 40, y: 455, width: 80, height: 75, rx: goggles ? 16 : 30, fill: goggles ? "#75DAEB" : "none", "fill-opacity": .2, stroke: goggles ? "#EAF8FF" : "#292B41", "stroke-width": goggles ? 10 : 8 }));
      shape(svg, "path", { d: "M484 478Q500 468 516 478M404 480L367 470M596 480L633 470", fill: "none", stroke: goggles ? "#EAF8FF" : "#292B41", "stroke-width": 8 });
    } else if (config.accessory === "headphones") {
      shape(svg, "path", { d: "M335 499C321 262 679 262 665 499", fill: "none", stroke: "#292B41", "stroke-width": 24 });
      [334, 644].forEach((x) => shape(svg, "rect", { x, y: 451, width: 32, height: 93, rx: 15, fill: "#FFBA5B", stroke: "#292B41", "stroke-width": 8 }));
    }
    if (config.hat === "graduate") layer("graduate");
    else if (config.hat === "space") layer("space", { transform: "translate(-75 -75) scale(1.15)" });
  }

  window.MosAvatar = { render };
})();
