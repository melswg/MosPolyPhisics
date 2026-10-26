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
    const space = config.hat === "space";
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
    let drawForegroundOrbits = () => {};
    // Геометрия снята с рендера mas.svg на главной, относительно той же сферы.
    if (orbits) {
      const orbitId = `${skinId}-orbit`;
      const tint = `filter:hue-rotate(${hues[config.color] || 0}deg)`;
      const tube = shape(defs, "linearGradient", { id: `${orbitId}-tube`, gradientUnits: "userSpaceOnUse", x1: 100, y1: 180, x2: 850, y2: 800 });
      [[0, "#D7B6E7"], [.3, "#AD7AC1"], [.65, "#C697D7"], [1, "#A06AB5"]].forEach(([offset, color]) => {
        shape(tube, "stop", { offset, "stop-color": color });
      });
      const bead = shape(defs, "radialGradient", { id: `${orbitId}-bead`, cx: ".28", cy: ".24", r: ".8" });
      [[0, "#E5CEF0"], [.35, "#C4A5D8"], [.75, "#A57DBB"], [1, "#79528D"]].forEach(([offset, color]) => {
        shape(bead, "stop", { offset, "stop-color": color });
      });
      const shadow = shape(defs, "filter", { id: `${orbitId}-shadow`, x: "-10%", y: "-10%", width: "120%", height: "120%" });
      shape(shadow, "feGaussianBlur", { stdDeviation: 2.2 });
      const bodyClip = shape(defs, "clipPath", { id: `${orbitId}-body` });
      shape(bodyClip, "circle", { cx: 500, cy: 490, r: 180 });
      const geometry = [
        { cx: 482.4, cy: 498.9, rx: 405.8, ry: 141.3, angle: -7.87 },
        { cx: 460.8, cy: 493.8, rx: 442.5, ry: 128, angle: 30.117 },
        { cx: 512.4, cy: 501.6, rx: 493.5, ry: 175.6, angle: -43.189 },
      ];
      function arcs(parent, front, castShadow = false) {
        geometry.forEach(({ cx, cy, rx, ry, angle }) => {
          const ring = shape(parent, "g", { transform: `rotate(${angle} ${cx} ${cy})` });
          const d = front ? `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}` : `M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
          if (castShadow) {
            shape(ring, "path", { d, fill: "none", stroke: "#472456", "stroke-width": 9, opacity: .18, transform: "translate(0 4)" });
            return;
          }
          shape(ring, "path", { d, fill: "none", stroke: "#815792", "stroke-width": 7, "stroke-linecap": "round" });
          shape(ring, "path", { d, fill: "none", stroke: `url(#${orbitId}-tube)`, "stroke-width": 5.6, "stroke-linecap": "round" });
          shape(ring, "path", { d, fill: "none", stroke: "#EFDAF8", "stroke-width": 1.3, opacity: .55, transform: "translate(0 -1.4)", "stroke-linecap": "round" });
        });
      }
      arcs(shape(svg, "g", { "data-orbits": "", style: tint }), false);
      drawForegroundOrbits = () => {
        const shade = shape(svg, "g", { "clip-path": `url(#${orbitId}-body)`, filter: `url(#${orbitId}-shadow)` });
        arcs(shade, true, true);
        const front = shape(svg, "g", { "data-orbits-front": "", style: tint });
        arcs(front, true);
        [[157.6, 621.6], [780.3, 744.7], [867, 313.5]].forEach(([cx, cy]) => {
          shape(front, "circle", { "data-orbit-bead": "", cx, cy, r: 24, fill: `url(#${orbitId}-bead)` });
        });
      };
    }
    shape(svg, "circle", { cx: 500, cy: 490, r: 180, fill: `url(#${skinId})`, style: `filter:hue-rotate(${hues[config.color] || 0}deg)` });

    function layer(name, attributes = {}) {
      shape(svg, "image", { href: `/assets/avatar/${name}.png?v=20261024`, x: 0, y: 0, width: 1000, height: 1000, ...attributes });
    }

    if (!space && (config.outfit === "labcoat" || config.outfit === "hoodie")) layer(config.outfit);
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
      layer(config.accessory);
    } else if (config.accessory === "headphones" && !space) {
      layer("headphones");
    }
    if (config.hat === "graduate") layer("graduate");
    else if (space) layer("space");
    drawForegroundOrbits();
  }

  window.MosAvatar = { render };
})();
