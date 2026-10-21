/* Общая типографика отображаемого текста, включая асинхронный контент */
(function () {
  "use strict";

  const abbreviations = new Set(["г", "гг", "ул", "д", "т", "е", "др", "им", "см", "рис", "руб", "шт", "гл"]);
  const excluded = "script, style, pre, code, textarea, input, svg, math, [contenteditable]:not([contenteditable='false']), [data-typography='off']";

  function formatText(text) {
    let result = text.replace(/([\p{L}]+|[)»”])\.(?=[»”"]?(?:[ \t\u00a0]+[«“"]?[А-ЯЁA-Z]|[\s\u00a0]*$))/gu, (match, word, offset) => {
      const initial = /^[А-ЯЁA-Z]$/u.test(word) && !/\d[ \t\u00a0]+$/u.test(text.slice(0, offset));
      if (initial || abbreviations.has(word.toLowerCase())) return match;
      return word;
    });
    result = result.replace(/(?<=[\d²³])\.(?=\s*$)/gu, "");
    if (result.trim() === ".") result = result.replace(".", "");
    return result.replace(/(?<![\p{L}\p{N}_/])((?:без|в|во|для|до|за|из|из-за|из-под|к|ко|между|на|над|о|об|обо|от|перед|по|под|при|про|с|со|у|через|и|а|но|не))[ \t]+(?=\S|$)/giu, (match, word, offset) => {
      if (word.length === 1 && /\d[ \t\u00a0]+$/u.test(result.slice(0, offset))) return match;
      return word + "\u00a0";
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { formatText };
  if (typeof document === "undefined") return;

  function formatNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || node.parentElement.closest(excluded)) return;
      const text = formatText(node.data);
      if (text !== node.data) node.data = text;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.closest(excluded)) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) formatNode(walker.currentNode);
  }

  document.addEventListener("DOMContentLoaded", () => {
    formatNode(document.body);
    // Обрабатываем только изменённые узлы, не перестраивая ссылки и обработчики
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") formatNode(record.target);
        else record.addedNodes.forEach(formatNode);
      }
    }).observe(document.body, { childList: true, characterData: true, subtree: true });
  });
})();
