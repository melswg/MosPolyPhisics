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

  function render(host, config) {
    host.replaceChildren();
    host.classList.add("simplik");
    const base = document.createElement("img");
    base.src = "/assets/brand/mas.svg";
    base.alt = "";
    base.width = 1000;
    base.height = 1000;
    base.style.filter = `hue-rotate(${hues[config.color] || 0}deg)`;
    host.appendChild(base);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1000 1000");
    svg.setAttribute("aria-hidden", "true");
    host.appendChild(svg);
    const skinId = `simplik-skin-${renderId++}`;
    const defs = shape(svg, "defs", {});
    const gradient = shape(defs, "linearGradient", { id: skinId, gradientUnits: "userSpaceOnUse", x1: 320, y1: 490, x2: 680, y2: 490 });
    shape(gradient, "stop", { offset: 0, "stop-color": "#B075CD" });
    shape(gradient, "stop", { offset: .5, "stop-color": "#AA5FBF" });
    shape(gradient, "stop", { offset: 1, "stop-color": "#C886DF" });
    const blur = shape(defs, "filter", { id: `${skinId}-blend` });
    shape(blur, "feGaussianBlur", { stdDeviation: 3 });
    const skin = shape(svg, "g", { style: `filter:hue-rotate(${hues[config.color] || 0}deg)` });
    if (config.face !== "smile") {
      const eyes = config.face === "wink" ? [556] : config.face === "happy" ? [444, 556] : [];
      eyes.forEach((x) => shape(skin, "ellipse", { cx: x, cy: 491, rx: 32, ry: 45, fill: `url(#${skinId})`, filter: `url(#${skinId}-blend)` }));
      shape(skin, "ellipse", { cx: 500, cy: 550, rx: 28, ry: 20, fill: `url(#${skinId})`, filter: `url(#${skinId}-blend)` });
    }

    if (config.outfit === "labcoat") {
      shape(svg, "path", { d: "M345 558 Q500 620 655 558 L624 640 Q500 725 376 640Z", fill: "#F0F2FA", stroke: "#B9C3D7", "stroke-width": 5 });
      shape(svg, "path", { d: "M424 577 L475 639 L500 595 L525 639 L576 577 M500 597V686", fill: "none", stroke: "#B9C3D7", "stroke-width": 5 });
      shape(svg, "rect", { x: 551, y: 621, width: 43, height: 25, rx: 4, fill: "#D8E2F2" });
      shape(svg, "path", { d: "M563 621V596M577 621V602", stroke: "#7233FE", "stroke-width": 7 });
    } else if (config.outfit === "hoodie") {
      shape(svg, "path", { d: "M345 558 Q500 608 655 558 L624 641 Q500 725 376 641Z", fill: "#282A46", stroke: "#434767", "stroke-width": 5 });
      shape(svg, "path", { d: "M440 580L458 623M560 580L542 623", stroke: "#E3DEFF", "stroke-width": 5 });
      const atom = shape(svg, "g", { transform: "translate(500 638)", fill: "none", stroke: "#A792FF", "stroke-width": 4 });
      [0, 60, -60].forEach((angle) => shape(atom, "ellipse", { cx: 0, cy: 0, rx: 35, ry: 13, transform: `rotate(${angle})` }));
      shape(atom, "circle", { cx: 0, cy: 0, r: 5, fill: "#A792FF" });
    }

    if (config.face === "happy") {
      [444, 556].forEach((x) => shape(svg, "path", { d: `M${x - 24} 498Q${x} 460 ${x + 24} 498`, fill: "none", stroke: "#252035", "stroke-width": 12, "stroke-linecap": "round" }));
    } else if (config.face === "wink") {
      shape(svg, "path", { d: "M530 493Q556 477 580 493", fill: "none", stroke: "#252035", "stroke-width": 11, "stroke-linecap": "round" });
    }
    if (config.face === "wow") {
      shape(svg, "ellipse", { cx: 500, cy: 549, rx: 14, ry: 19, fill: "#252035" });
    } else if (config.face !== "smile") {
      shape(svg, "path", { d: config.face === "happy" ? "M473 541Q500 596 527 541Z" : "M482 547Q500 565 518 547", fill: config.face === "happy" ? "#252035" : "none", stroke: "#252035", "stroke-width": 6, "stroke-linecap": "round" });
    }

    if (config.accessory === "glasses" || config.accessory === "goggles") {
      const goggles = config.accessory === "goggles";
      [444, 556].forEach((x) => shape(svg, "rect", { x: x - 40, y: 455, width: 80, height: 75, rx: goggles ? 16 : 30, fill: goggles ? "#75DAEB" : "none", "fill-opacity": .2, stroke: goggles ? "#EAF8FF" : "#292B41", "stroke-width": goggles ? 10 : 8 }));
      shape(svg, "path", { d: "M484 478Q500 468 516 478M404 480L367 470M596 480L633 470", fill: "none", stroke: goggles ? "#EAF8FF" : "#292B41", "stroke-width": 8 });
    } else if (config.accessory === "headphones") {
      shape(svg, "path", { d: "M335 499C321 262 679 262 665 499", fill: "none", stroke: "#292B41", "stroke-width": 24 });
      [334, 644].forEach((x) => shape(svg, "rect", { x, y: 451, width: 32, height: 93, rx: 15, fill: "#FFBA5B", stroke: "#292B41", "stroke-width": 8 }));
    }
    if (config.hat === "graduate") {
      shape(svg, "path", { d: "M414 321V373Q500 399 586 373V321", fill: "#292B41" });
      shape(svg, "path", { d: "M353 307L500 256L647 307L500 359Z", fill: "#292B41", stroke: "#74758B", "stroke-width": 5 });
      shape(svg, "path", { d: "M500 307L613 335V415", fill: "none", stroke: "#FFCE72", "stroke-width": 7 });
      shape(svg, "circle", { cx: 613, cy: 420, r: 11, fill: "#FFCE72" });
    } else if (config.hat === "space") {
      shape(svg, "ellipse", { cx: 500, cy: 490, rx: 202, ry: 203, fill: "#93D9FF", "fill-opacity": .08, stroke: "#E3EDF6", "stroke-width": 18 });
      shape(svg, "path", { d: "M374 381Q424 334 474 333", fill: "none", stroke: "#FFFFFF", "stroke-width": 14, "stroke-linecap": "round", opacity: .7 });
      [287, 681].forEach((x) => shape(svg, "rect", { x, y: 455, width: 32, height: 73, rx: 9, fill: "#CEDBEA" }));
    }
  }

  window.MosAvatar = { render };
})();
