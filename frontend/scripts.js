/**
 * Основной скрипт для сайта МосПоли ФИЗИКС
 * Обрабатывает мобильное меню, переключение тем и плавную прокрутку
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (DARK / LIGHT)
    // =========================================
    
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const rootElement = document.documentElement;

    function updateThemeIcon(theme, iconEl) {
        if (!iconEl) return;
        if (theme === 'light') {
            iconEl.classList.remove('fa-sun');
            iconEl.classList.add('fa-moon');
        } else {
            iconEl.classList.remove('fa-moon');
            iconEl.classList.add('fa-sun');
        }
    }

    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        rootElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme, themeIcon);

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = rootElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            rootElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme, themeIcon);
        });
    }

    // =========================================
    // МОБИЛЬНОЕ МЕНЮ
    // =========================================
    
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav__link');

    function toggleMenu() {
        nav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        if (nav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (nav.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // =========================================
    // ПЛАВНАЯ ПРОКРУТКА (SCROLL)
    // =========================================
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // =========================================
    // АНИМАЦИЯ КАРТОЧЕК
    // =========================================
    
    const cards = document.querySelectorAll('.card');
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        observer.observe(card);
    });
});

// =========================================
// ПОДСВЕТКА АКТИВНОЙ ССЫЛКИ В МЕНЮ
// =========================================

const currentPath = location.pathname.replace(/\/$/, '') || '/';
const menuItems = document.querySelectorAll('.nav__link');
for (let i = 0; i < menuItems.length; i++) {
    try {
        const linkPath = new URL(menuItems[i].href, location.origin).pathname.replace(/\/$/, '') || '/';
        if (linkPath === currentPath) {
            menuItems[i].classList.add('active');
        }
    } catch (_) {
        if (menuItems[i].href === location.href) {
            menuItems[i].classList.add('active');
        }
    }
}
