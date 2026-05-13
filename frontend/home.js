/**
 * Главная страница: цитата с API.
 */
document.addEventListener("DOMContentLoaded", function () {
  var quoteEl = document.querySelector(".hero__quote");
  var citeEl = document.querySelector(".hero__author");
  if (!quoteEl || !window.MosAPI) return;

  window.MosAPI
    .getQuote()
    .then(function (data) {
      if (data && data.quote) {
        quoteEl.textContent = data.quote;
        if (citeEl) citeEl.style.display = "none";
      }
    })
    .catch(function () {
      /* оставляем статичный fallback из HTML */
    });
});
