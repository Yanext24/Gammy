# Gammy Blog

Gammy Blog - социальная лента и блог-платформа на русском языке.

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Разработка (с авто-перезагрузкой)
npm run dev

# Продакшен
npm start
```

Сервер запускается на `http://localhost:3000` (или PORT из env).

## Архитектура

### Стек технологий
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Frontend**: Vanilla JS + CSS (без фреймворков)

### Структура проекта

```
/
├── server/
│   ├── index.js          # Главный сервер Express
│   ├── db.js             # SQLite инициализация и схема
│   ├── middleware/
│   │   └── auth.js       # JWT middleware
│   └── routes/
│       ├── auth.js       # Аутентификация (/api/auth)
│       ├── users.js      # Пользователи (/api/users)
│       ├── posts.js      # Посты ленты (/api/posts)
│       ├── articles.js   # Статьи блога (/api/articles)
│       ├── comments.js   # Комментарии (/api/comments)
│       ├── categories.js # Категории (/api/categories)
│       ├── media.js      # Загрузка файлов (/api/media)
│       └── settings.js   # Настройки сайта (/api/settings)
├── js/
│   ├── api.js            # API клиент (window.API)
│   ├── app.js            # Основная логика (Auth, UI)
│   ├── feed.js           # Лента постов
│   └── admin.js          # Админ-панель
├── css/
│   └── style.css         # Все стили
├── pages/
│   ├── admin.html        # Админ-панель
│   ├── profile.html      # Профиль пользователя
│   ├── post.html         # Страница поста
│   ├── article.html      # Страница статьи
│   ├── about.html        # О нас
│   ├── contact.html      # Контакты
│   └── categories.html   # Категории
├── index.html            # Главная (лента)
├── blog.html             # Блог (статьи)
└── uploads/              # Загруженные файлы
```

### База данных

SQLite база хранится в:
- Локально: `data/gammy.db`
- Продакшен: `/data/gammy.db`

Основные таблицы:
- `users` - пользователи (email, password, name, role)
- `posts` - посты ленты
- `post_likes`, `post_comments` - лайки и комментарии постов
- `articles` - статьи блога
- `article_comments` - комментарии статей
- `categories` - категории
- `media` - загруженные файлы
- `settings` - настройки сайта (key-value)

### Роли пользователей
- `user` - обычный пользователь
- `admin` - администратор (доступ к админ-панели)

## API

Все эндпоинты начинаются с `/api`.

### Аутентификация
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `GET /api/auth/me` - текущий пользователь
- `PUT /api/auth/me` - обновить профиль
- `PUT /api/auth/password` - сменить пароль

### Посты (Лента)
- `GET /api/posts` - список постов
- `GET /api/posts/:id` - пост по ID
- `GET /api/posts/slug/:slug` - пост по slug
- `POST /api/posts` - создать пост (auth)
- `PUT /api/posts/:id` - редактировать (auth)
- `DELETE /api/posts/:id` - удалить (auth)
- `POST /api/posts/:id/like` - лайк

### Статьи (Блог)
- `GET /api/articles` - список статей
- `GET /api/articles/:id` - статья по ID
- `POST /api/articles` - создать (admin)
- `PUT /api/articles/:id` - редактировать (admin)
- `DELETE /api/articles/:id` - удалить (admin)

### Настройки
- `GET /api/settings` - все настройки
- `PUT /api/settings/:key` - обновить настройку (admin)
- `POST /api/settings/bulk` - массовое обновление (admin)

## Важные особенности кода

### Инициализация Auth
Frontend использует асинхронную инициализацию Auth. Код, зависящий от Auth, должен дождаться его готовности:

```javascript
// Пример ожидания Auth
let attempts = 0;
while (!window.Auth && attempts < 40) {
    await new Promise(r => setTimeout(r, 50));
    attempts++;
}
// Ждем пока Auth проверит токен
while (attempts < 30) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
    if (window.Auth.currentUser !== undefined || !localStorage.getItem('gammy_token')) {
        break;
    }
}
```

### Динамический контент страниц
Информационные страницы (about, contact, categories, blog) загружают контент из настроек API:
- Hero-заголовки
- SEO мета-теги
- Контактная информация

### CSS классы
Стили используют BEM-подобную нотацию. Основные компоненты:
- `.header`, `.nav`, `.nav-link`
- `.card`, `.article-card`, `.post-card`
- `.btn`, `.btn-primary`, `.btn-outline`
- `.modal`, `.modal-content`
- `.toast` - уведомления

## Деплой

### PM2 (рекомендуется)
```bash
pm2 start server/index.js --name gammy
pm2 save
```

### Переменные окружения
- `PORT` - порт сервера (default: 3000)
- `NODE_ENV` - окружение (production меняет путь к БД)
- `JWT_SECRET` - секрет для JWT (по умолчанию встроен)

## Учетные данные по умолчанию

- **Admin**: admin@gammy.blog / admin123

## Известные особенности

1. SPA-fallback: все не-API роуты отдают index.html
2. Загрузка файлов: multer + base64 поддержка
3. Лимит JSON body: 50mb (для base64 изображений)
