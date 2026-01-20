/**
 * Gammy Blog - Main Application JavaScript
 * Works with server API instead of localStorage
 */

// ============================================
// AUTH - Authentication System
// ============================================

const Auth = {
    currentUser: null,

    async init() {
        const token = localStorage.getItem('gammy_token');
        if (token) {
            try {
                this.currentUser = await API.getMe();
                this.updateUI();
            } catch (err) {
                // Token expired or invalid
                API.logout();
            }
        }
    },

    isLoggedIn() {
        return !!this.currentUser;
    },

    isAdmin() {
        return this.currentUser?.role === 'admin';
    },

    getCurrentUser() {
        return this.currentUser;
    },

    async login(email, password) {
        const data = await API.login(email, password);
        this.currentUser = data.user;
        this.updateUI();
        return data.user;
    },

    async register(name, email, password) {
        const data = await API.register(name, email, password);
        this.currentUser = data.user;
        this.updateUI();
        return data.user;
    },

    logout() {
        API.logout();
        this.currentUser = null;
        this.updateUI();
        if (window.location.pathname.includes('admin') || window.location.pathname.includes('profile')) {
            window.location.href = '/';
        }
    },

    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userInitial = document.getElementById('userInitial');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const adminLink = document.getElementById('adminLink');
        const userAvatarBtn = document.getElementById('userAvatarBtn');

        if (this.currentUser) {
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userName) userName.textContent = this.currentUser.name;
            if (userEmail) userEmail.textContent = this.currentUser.email;

            if (userAvatarBtn) {
                if (this.currentUser.avatar) {
                    userAvatarBtn.innerHTML = `<img src="${this.currentUser.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    if (userInitial) userInitial.textContent = this.currentUser.name.charAt(0).toUpperCase();
                }
            }

            if (adminLink) {
                adminLink.classList.toggle('hidden', this.currentUser.role !== 'admin');
            }
        } else {
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }
};

// ============================================
// UI - User Interface Utilities
// ============================================

const UI = {
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
    },

    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин. назад`;
        if (hours < 24) return `${hours} ч. назад`;
        if (days < 7) return `${days} дн. назад`;

        return this.formatDateShort(dateString);
    },

    truncate(text, length) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast show ${type}`;

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    },

    getCategoryName(slug) {
        const names = {
            tech: 'Технологии',
            design: 'Дизайн',
            dev: 'Разработка',
            news: 'Новости',
            ai: 'Нейросети',
            games: 'Игры',
            software: 'Софт',
            video: 'Видео',
            music: 'Музыка'
        };
        return names[slug] || slug;
    },

    getCategoryColor(slug) {
        const colors = {
            tech: '#6366f1',
            design: '#ec4899',
            dev: '#10b981',
            news: '#f59e0b',
            ai: '#8b5cf6',
            games: '#ef4444',
            software: '#3b82f6',
            video: '#f97316',
            music: '#06b6d4'
        };
        return colors[slug] || '#6366f1';
    }
};

// ============================================
// THEME - Dark/Light Mode
// ============================================

const Theme = {
    init() {
        const saved = localStorage.getItem('gammy_theme') || 'dark';
        this.set(saved);

        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
    },

    get() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    },

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gammy_theme', theme);
    },

    toggle() {
        const current = this.get();
        this.set(current === 'dark' ? 'light' : 'dark');
    }
};

// ============================================
// MODALS - Auth Modals
// ============================================

const Modals = {
    init() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Register button
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }

        // User avatar dropdown
        const userAvatarBtn = document.getElementById('userAvatarBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (userAvatarBtn && userDropdown) {
            userAvatarBtn.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    },

    showLoginModal() {
        this.removeExistingModal();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'authModal';
        modal.innerHTML = `
            <div class="modal glass">
                <button class="modal-close" onclick="Modals.close()">&times;</button>
                <h2 class="modal-title">Вход</h2>
                <form id="loginForm" class="auth-form">
                    <div class="form-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Пароль</label>
                        <input type="password" id="loginPassword" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Войти</button>
                </form>
                <p class="auth-switch">Нет аккаунта? <a href="#" onclick="Modals.showRegisterModal(); return false;">Зарегистрироваться</a></p>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await Auth.login(email, password);
                this.close();
                UI.showToast('Добро пожаловать!');
            } catch (err) {
                UI.showToast(err.message || 'Ошибка входа', 'error');
            }
        });
    },

    showRegisterModal() {
        this.removeExistingModal();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'authModal';
        modal.innerHTML = `
            <div class="modal glass">
                <button class="modal-close" onclick="Modals.close()">&times;</button>
                <h2 class="modal-title">Регистрация</h2>
                <form id="registerForm" class="auth-form">
                    <div class="form-group">
                        <label for="registerName">Имя</label>
                        <input type="text" id="registerName" required placeholder="Ваше имя">
                    </div>
                    <div class="form-group">
                        <label for="registerEmail">Email</label>
                        <input type="email" id="registerEmail" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Пароль</label>
                        <input type="password" id="registerPassword" required minlength="6" placeholder="Минимум 6 символов">
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Зарегистрироваться</button>
                </form>
                <p class="auth-switch">Уже есть аккаунт? <a href="#" onclick="Modals.showLoginModal(); return false;">Войти</a></p>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            try {
                await Auth.register(name, email, password);
                this.close();
                UI.showToast('Регистрация успешна!');
            } catch (err) {
                UI.showToast(err.message || 'Ошибка регистрации', 'error');
            }
        });
    },

    removeExistingModal() {
        const existing = document.getElementById('authModal');
        if (existing) existing.remove();
    },

    close() {
        const modal = document.getElementById('authModal');
        if (modal) modal.remove();
    }
};

// ============================================
// ARTICLES - Blog Articles
// ============================================

const Articles = {
    async init() {
        await this.loadArticles();
        this.initFilters();
        this.initSearch();
    },

    async loadArticles(category = 'all') {
        const grid = document.getElementById('articlesGrid');
        if (!grid) return;

        try {
            const params = category !== 'all' ? { category } : {};
            const articles = await API.getArticles(params);

            if (articles.length === 0) {
                grid.innerHTML = '<p class="no-results">Статьи не найдены</p>';
                return;
            }

            grid.innerHTML = articles.map(article => this.renderArticleCard(article)).join('');
        } catch (err) {
            console.error('Load articles error:', err);
            grid.innerHTML = '<p class="no-results">Ошибка загрузки статей</p>';
        }
    },

    renderArticleCard(article) {
        const categoryColor = UI.getCategoryColor(article.category);
        return `
            <article class="article-card glass">
                <a href="pages/article.html?slug=${article.slug}" class="article-image-link">
                    <img src="${article.image || 'https://via.placeholder.com/400x250'}" alt="${article.title}" class="article-image" loading="lazy">
                </a>
                <div class="article-content">
                    <a href="pages/article.html?slug=${article.slug}" class="article-category" style="color: ${categoryColor}">${UI.getCategoryName(article.category)}</a>
                    <a href="pages/article.html?slug=${article.slug}" class="article-title-link">
                        <h3 class="article-title">${article.title}</h3>
                    </a>
                    <p class="article-excerpt">${UI.truncate(article.excerpt, 120)}</p>
                    <div class="article-meta">
                        <span class="article-date">${UI.formatDate(article.created_at)}</span>
                        <span class="article-views">${article.views} просмотров</span>
                    </div>
                </div>
            </article>
        `;
    },

    initFilters() {
        const buttons = document.querySelectorAll('.category-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadArticles(btn.dataset.category);
            });
        });
    },

    initSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.search(e.target.value);
                }, 300);
            });
        }
    },

    async search(query) {
        const grid = document.getElementById('articlesGrid');
        if (!grid) return;

        if (!query) {
            this.loadArticles();
            return;
        }

        try {
            const articles = await API.getArticles();
            const filtered = articles.filter(a =>
                a.title.toLowerCase().includes(query.toLowerCase()) ||
                a.excerpt?.toLowerCase().includes(query.toLowerCase())
            );

            if (filtered.length === 0) {
                grid.innerHTML = '<p class="no-results">Ничего не найдено</p>';
                return;
            }

            grid.innerHTML = filtered.map(article => this.renderArticleCard(article)).join('');
        } catch (err) {
            console.error('Search error:', err);
        }
    }
};

// ============================================
// ARTICLE PAGE
// ============================================

const ArticlePage = {
    article: null,

    async init() {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug') || params.get('id');

        if (!slug) return;

        try {
            this.article = await API.getArticleBySlug(slug);
            this.render();
            this.loadComments();
            this.initCommentForm();
        } catch (err) {
            console.error('Load article error:', err);
            document.querySelector('.article-page')?.innerHTML = '<div class="container"><p>Статья не найдена</p></div>';
        }
    },

    render() {
        const container = document.querySelector('.article-page');
        if (!container || !this.article) return;

        document.title = this.article.seo_title || this.article.title + ' - Gammy Blog';

        const categoryColor = UI.getCategoryColor(this.article.category);

        container.innerHTML = `
            <div class="container">
                <article class="article-full">
                    <header class="article-header">
                        <a href="../blog.html?category=${this.article.category}" class="article-category" style="color: ${categoryColor}">${UI.getCategoryName(this.article.category)}</a>
                        <h1 class="article-title">${this.article.title}</h1>
                        <div class="article-meta">
                            <span class="article-author">${this.article.author_name || 'Admin'}</span>
                            <span class="article-date">${UI.formatDate(this.article.created_at)}</span>
                            <span class="article-views">${this.article.views} просмотров</span>
                        </div>
                    </header>

                    ${this.article.image ? `<img src="${this.article.image}" alt="${this.article.title}" class="article-hero-image">` : ''}

                    <div class="article-body">
                        ${this.article.content || ''}
                    </div>
                </article>

                <section class="comments-section glass">
                    <h3 class="comments-title">Комментарии (<span id="commentsCount">0</span>)</h3>

                    <form id="commentForm" class="comment-form">
                        <div class="guest-fields ${Auth.isLoggedIn() ? 'hidden' : ''}">
                            <div class="form-group">
                                <input type="text" id="commentName" placeholder="Ваше имя" ${Auth.isLoggedIn() ? '' : 'required'}>
                            </div>
                            <div class="form-group">
                                <input type="email" id="commentEmail" placeholder="Email (не публикуется)">
                            </div>
                        </div>
                        <div class="form-group">
                            <textarea id="commentText" placeholder="Ваш комментарий..." required rows="4"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </form>

                    <div id="commentsList" class="comments-list"></div>
                </section>
            </div>
        `;
    },

    async loadComments() {
        if (!this.article) return;

        try {
            const comments = await API.getArticleComments(this.article.id);
            const countEl = document.getElementById('commentsCount');
            const listEl = document.getElementById('commentsList');

            if (countEl) countEl.textContent = comments.length;

            if (listEl) {
                listEl.innerHTML = comments.map(comment => `
                    <div class="comment">
                        <div class="comment-avatar">
                            ${comment.user_avatar ? `<img src="${comment.user_avatar}" alt="">` : comment.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.author_name}</span>
                                <span class="comment-date">${UI.timeAgo(comment.created_at)}</span>
                            </div>
                            <p class="comment-text">${comment.content}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Load comments error:', err);
        }
    },

    initCommentForm() {
        const form = document.getElementById('commentForm');
        if (!form || !this.article) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const content = document.getElementById('commentText').value;
            const name = document.getElementById('commentName')?.value;
            const email = document.getElementById('commentEmail')?.value;

            try {
                await API.addArticleComment(this.article.id, {
                    content,
                    author_name: name,
                    author_email: email
                });

                document.getElementById('commentText').value = '';
                this.loadComments();
                UI.showToast('Комментарий добавлен');
            } catch (err) {
                UI.showToast(err.message || 'Ошибка', 'error');
            }
        });
    }
};

// ============================================
// MOBILE MENU
// ============================================

const MobileMenu = {
    init() {
        const btn = document.getElementById('mobileMenuBtn');
        const menu = document.getElementById('mobileMenu');

        if (btn && menu) {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                menu.classList.toggle('show');
            });
        }
    }
};

// ============================================
// CATEGORIES PAGE
// ============================================

const CategoriesPage = {
    async init() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;

        try {
            const categories = await API.getCategories();

            grid.innerHTML = categories.map(cat => `
                <a href="../blog.html?category=${cat.slug}" class="category-card glass">
                    <div class="category-icon" style="background: ${cat.color}">
                        ${cat.icon || cat.name.charAt(0)}
                    </div>
                    <h3 class="category-name">${cat.name}</h3>
                    <span class="category-count">${cat.articles_count || 0} статей</span>
                </a>
            `).join('');
        } catch (err) {
            console.error('Load categories error:', err);
        }
    }
};

// ============================================
// PROFILE PAGE
// ============================================

const ProfilePage = {
    async init() {
        if (!Auth.isLoggedIn()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadProfile();
        this.initForm();
    },

    async loadProfile() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        document.getElementById('profileName')?.textContent && (document.getElementById('profileName').textContent = user.name);
        document.getElementById('profileEmail')?.textContent && (document.getElementById('profileEmail').textContent = user.email);

        const avatarEl = document.getElementById('profileAvatarLarge');
        if (avatarEl) {
            if (user.avatar) {
                avatarEl.innerHTML = `<img src="${user.avatar}" alt="">`;
            } else {
                avatarEl.textContent = user.name.charAt(0).toUpperCase();
            }
        }

        // Form fields
        const nameInput = document.getElementById('profileNameInput');
        const emailInput = document.getElementById('profileEmailInput');
        const bioInput = document.getElementById('profileBioInput');

        if (nameInput) nameInput.value = user.name;
        if (emailInput) emailInput.value = user.email;
        if (bioInput) bioInput.value = user.bio || '';
    },

    initForm() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('profileNameInput').value;
            const bio = document.getElementById('profileBioInput')?.value;
            const avatar = Auth.currentUser.avatar;

            try {
                const updated = await API.updateMe({ name, bio, avatar });
                Auth.currentUser = updated;
                Auth.updateUI();
                this.loadProfile();
                UI.showToast('Профиль обновлён');
            } catch (err) {
                UI.showToast(err.message || 'Ошибка', 'error');
            }
        });

        // Avatar upload
        const avatarInput = document.getElementById('avatarFileInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const media = await API.uploadBase64(ev.target.result, file.name);
                        Auth.currentUser.avatar = media.path;
                        await API.updateMe({ name: Auth.currentUser.name, bio: Auth.currentUser.bio, avatar: media.path });
                        this.loadProfile();
                        Auth.updateUI();
                        UI.showToast('Аватар обновлён');
                    } catch (err) {
                        UI.showToast('Ошибка загрузки', 'error');
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Init core modules
    Theme.init();
    MobileMenu.init();
    Modals.init();

    // Init auth
    await Auth.init();

    // Determine which page we're on and init appropriate module
    const path = window.location.pathname;

    if (path.includes('article.html')) {
        await ArticlePage.init();
    } else if (path.includes('categories.html')) {
        await CategoriesPage.init();
    } else if (path.includes('profile.html')) {
        await ProfilePage.init();
    } else if (path.includes('blog.html') || path === '/' || path.endsWith('index.html')) {
        // Blog page - init articles if grid exists
        if (document.getElementById('articlesGrid')) {
            await Articles.init();
        }
    }
});

// Export for global access
window.Auth = Auth;
window.UI = UI;
window.Modals = Modals;
window.Articles = Articles;
window.ArticlePage = ArticlePage;
