document.addEventListener("DOMContentLoaded", function () {
  var el = document.getElementById("video-root");
  if (!el || !window.MosAPI) return;
  window.MosAPI
    .getVideos()
    .then(function (rows) {
      if (!rows || !rows.length) {
        el.innerHTML = "<p>Видео скоро появятся.</p>";
        return;
      }
      rows.forEach(function (v) {
        var wrap = document.createElement("div");
        wrap.style.marginBottom = "2rem";
        var t = document.createElement("h3");
        t.textContent = v.title || "Видео";
        wrap.appendChild(t);
        var iframe = document.createElement("iframe");
        iframe.width = "560";
        iframe.height = "315";
        iframe.style.maxWidth = "100%";
        iframe.src = v.url;
        iframe.title = v.title || "video";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        );
        iframe.setAttribute("allowfullscreen", "true");
        wrap.appendChild(iframe);
        el.appendChild(wrap);
      });
    })
    .catch(function () {
      el.innerHTML = "<p class=\"form-msg form-msg--error\">Не удалось загрузить видео.</p>";
    });
});
