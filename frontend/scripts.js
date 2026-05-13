// Тут логика на стороне браузера.
// Тип перелючение тем, вызов цитат с бэкенда и тп

async function fetchNews() {
    try {
        const response = await fetch('/api/news');
        const news = await response.json();
        
        const container = document.getElementById('news-container'); // блок для новостей
        container.innerHTML = ''; // чистка контейнераа

        news.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-card'; //стили
            newsItem.innerHTML = `
                <h3>${item.title}</h3>
                <p><small>${item.date}</small></p>
                <p>${item.content}</p>
            `;
            container.appendChild(newsItem);
        });
    } catch (error) {
        console.error('Ошибка при загрузке новостей:', error);
    }
}

// запускаем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', fetchNews);