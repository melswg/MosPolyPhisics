/**
 * МосПоли ФИЗИКС - Основной скрипт сайта
 * 
 * Функциональность:
 * - Переключение темы (темная/светлая)
 * - Мобильное меню
 * - Плавная прокрутка якорных ссылок
 * - Анимация появления карточек
 * - Подсветка активной ссылки в навигации
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================
    // 1. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (DARK / LIGHT)
    // =========================================
    // Сохраняет выбранную тему в localStorage
    
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const rootElement = document.documentElement;
    const themeIcon = themeToggleBtn.querySelector('i');

    // Загрузить сохраненную тему или установить темную по умолчанию
    const savedTheme = localStorage.getItem('theme') || 'dark';
    rootElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Обработчик клика на кнопку смены темы
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Обновить тему и сохранить выбор
        rootElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    /**
     * Обновить иконку темы на основе текущей темы
     * @param {string} theme - 'dark' или 'light'
     */
    function updateThemeIcon(theme) {
        if (theme === 'light') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    // =========================================
    // 2. МОБИЛЬНОЕ МЕНЮ
    // =========================================
    // Переключает видимость навигации на мобильных устройствах
    
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav__link');

    /**
     * Переключить видимость мобильного меню
     */
    function toggleMenu() {
        nav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        
        // Изменить иконку: меню <-> закрытие
        if (nav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }

    // Открыть/закрыть меню при клике на кнопку
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
    }

    // Закрыть меню при клике на ссылку навигации
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (nav.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // =========================================
    // 3. ПЛАВНАЯ ПРОКРУТКА (SCROLL)
    // =========================================
    // Обеспечивает плавную прокрутку к якорям на странице
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Учитывать высоту фиксированного хедера
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
    // 4. АНИМАЦИЯ КАРТОЧЕК
    // =========================================
    // Карточки появляются с анимацией при прокрутке
    
    const cards = document.querySelectorAll('.card');
    const observerOptions = { 
        threshold: 0.1, 
        rootMargin: "0px 0px -50px 0px" 
    };

    // Использовать Intersection Observer для эффективной анимации
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Карточка видна - показать её
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Инициализировать карточки (скрыты по умолчанию)
    cards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        // Каждая карточка появляется с задержкой
        card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
        observer.observe(card);
    });
});

// =========================================
// 5. ПОДСВЕТКА АКТИВНОЙ ССЫЛКИ
// =========================================
// Подсвечивает текущую страницу в меню навигации

const currentLocation = location.href;
const menuItems = document.querySelectorAll('.nav__link');
const menuLength = menuItems.length;

for (let i = 0; i < menuLength; i++) {
    if (menuItems[i].href === currentLocation) {
        menuItems[i].classList.add('active');
    }
}
