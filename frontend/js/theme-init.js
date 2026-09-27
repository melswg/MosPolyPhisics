/* Тема до первой отрисовки: без этого виден тёмный фон при светлой схеме. */
document.documentElement.dataset.theme = localStorage.getItem("mosphysics-theme") === "light" ? "light" : "dark";
