// Тема, мобильное меню, соцсети из site-config.js, новости (если есть блок)

(function () {
    const THEME_KEY = "mosphysics-theme";

    function getStoredTheme() {
        try {
            const t = localStorage.getItem(THEME_KEY);
            if (t === "light" || t === "dark") return t;
        } catch (_) {}
        return "dark";
    }

    function setThemeIcons(theme) {
        const iconClass = theme === "dark" ? "fa-regular fa-sun" : "fa-regular fa-moon";
        document.querySelectorAll(".theme-toggle i").forEach(function (icon) {
            icon.className = iconClass;
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (_) {}
        setThemeIcons(theme);
    }

    function initTheme() {
        applyTheme(getStoredTheme());
        document.querySelectorAll(".theme-toggle").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const cur =
                    document.documentElement.getAttribute("data-theme") === "light"
                        ? "light"
                        : "dark";
                applyTheme(cur === "dark" ? "light" : "dark");
            });
        });
    }

    function initMobileMenu() {
        var nav = document.querySelector("header .nav");
        var btn = document.querySelector("header .mobile-menu-btn");
        if (!nav || !btn) return;

        function closeMenu() {
            nav.classList.remove("active");
            btn.setAttribute("aria-expanded", "false");
            btn.setAttribute("aria-label", "Открыть меню");
        }

        function openMenu() {
            nav.classList.add("active");
            btn.setAttribute("aria-expanded", "true");
            btn.setAttribute("aria-label", "Закрыть меню");
        }

        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (nav.classList.contains("active")) closeMenu();
            else openMenu();
        });

        nav.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", function (e) {
            if (!nav.classList.contains("active")) return;
            if (nav.contains(e.target) || btn.contains(e.target)) return;
            closeMenu();
        });

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeMenu();
        });
    }

    function applySocialLinks() {
        var cfg =
            typeof window.MOSPHY_SITE !== "undefined" && window.MOSPHY_SITE.social
                ? window.MOSPHY_SITE.social
                : {};
        document.querySelectorAll(".social-links a[data-social]").forEach(function (a) {
            var key = a.getAttribute("data-social");
            var url = (cfg[key] != null ? String(cfg[key]) : "").trim();
            if (url) {
                a.href = url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.removeAttribute("aria-disabled");
            } else {
                a.href = "#";
                a.setAttribute("aria-disabled", "true");
                a.removeAttribute("target");
                a.removeAttribute("rel");
            }
        });
    }

    async function fetchNews() {
        var container = document.getElementById("news-container");
        if (!container) return;
        try {
            var response = await fetch("/api/news");
            var news = await response.json();
            container.innerHTML = "";
            news.forEach(function (item) {
                var newsItem = document.createElement("div");
                newsItem.className = "news-card";
                newsItem.innerHTML =
                    "<h3>" +
                    item.title +
                    "</h3><p><small>" +
                    item.date +
                    "</small></p><p>" +
                    item.content +
                    "</p>";
                container.appendChild(newsItem);
            });
        } catch (error) {
            console.error("Ошибка при загрузке новостей:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        initMobileMenu();
        applySocialLinks();
        fetchNews();
    });
})();
