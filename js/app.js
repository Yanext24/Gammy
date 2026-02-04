/**
 * Gammy Blog - Main Application JavaScript
 * Works with server API instead of localStorage
 */

// ============================================
// AUTH - Authentication System
// ============================================

const Auth = {
    currentUser: null,
    _initialized: false,

    async init() {
        const token = localStorage.getItem('gammy_token');
        if (token) {
            try {
                this.currentUser = await API.getMe();
            } catch (err) {
                // Token expired or invalid
                API.logout();
                this.currentUser = null;
            }
        }
        this._initialized = true;
        // Always update UI after init to set correct visibility
        this.updateUI();
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

        // Mobile elements
        const mobileAuth = document.getElementById('mobileAuth');
        const mobileUser = document.getElementById('mobileUser');
        const mobileAdminLink = document.getElementById('mobileAdminLink');

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

            // Mobile UI
            if (mobileAuth) mobileAuth.classList.add('hidden');
            if (mobileUser) mobileUser.classList.remove('hidden');
            if (mobileAdminLink) {
                mobileAdminLink.classList.toggle('hidden', this.currentUser.role !== 'admin');
            }
        } else {
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');

            // Mobile UI
            if (mobileAuth) mobileAuth.classList.remove('hidden');
            if (mobileUser) mobileUser.classList.add('hidden');
        }
    }
};

// ============================================
// UI - User Interface Utilities
// ============================================

const UI = {
    init() {
        this.loadFooterCategories();
    },

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
            toast.className = `toast active ${type}`;

            setTimeout(() => {
                toast.classList.remove('active');
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
    },

    async loadFooterCategories() {
        console.log('[UI] loadFooterCategories called');
        const footerCategoriesNav = document.querySelector('.footer-categories-nav');
        if (!footerCategoriesNav) return;

        try {
            const categories = await API.getCategories();
            const footerCategories = categories.filter(cat => cat.show_in_footer !== 0);

            if (footerCategories && footerCategories.length > 0) {
                const isInPages = window.location.pathname.includes('/pages/');
                const basePath = isInPages ? 'categories.html' : 'pages/categories.html';

                footerCategoriesNav.innerHTML = footerCategories.map(cat =>
                    `<a href="${basePath}?cat=${cat.slug}">${cat.name}</a>`
                ).join('');
            }
        } catch (err) {
            console.error('[UI] Failed to load footer categories:', err);
        }
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

        // Load accent colors from settings
        this.loadAccentColors();
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
    },

    async loadAccentColors() {
        try {
            const settings = await API.getSettings();

            const color1 = settings.accentColor1 || '#6366f1';
            const color2 = settings.accentColor2 || '#8b5cf6';
            const color3 = settings.accentColor3 || '#a855f7';

            document.documentElement.style.setProperty('--accent-primary', color1);
            document.documentElement.style.setProperty('--accent-secondary', color2);
            document.documentElement.style.setProperty('--accent-tertiary', color3);
            document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`);

            // Update brand name if set
            if (settings.brandSiteName) {
                document.querySelectorAll('.logo-text').forEach(el => {
                    el.textContent = settings.brandSiteName;
                });
            }
            if (settings.brandLogoIcon) {
                document.querySelectorAll('.logo-icon').forEach(el => {
                    el.textContent = settings.brandLogoIcon;
                });
            }

            // Update footer from settings
            this.updateFooter(settings);

            // Update hero sections based on current page
            this.updateHeroSections(settings);
        } catch (err) {
            console.error('Load accent colors error:', err);
        }
    },

    updateHeroSections(settings) {
        const path = window.location.pathname;

        // Home/Blog page hero
        if (path.includes('blog.html') || path === '/' || path.endsWith('index.html')) {
            const title = document.getElementById('homeHeroTitle');
            const highlight = document.getElementById('homeHeroHighlight');
            const subtitle = document.getElementById('homeHeroSubtitle');

            if (title) {
                const titleText = settings.homeHeroTitle || 'Добро пожаловать в';
                const highlightText = settings.homeHeroTitleHighlight || 'Gammy Blog';
                title.innerHTML = `${titleText} <span class="gradient-text" id="homeHeroHighlight">${highlightText}</span>`;
            }
            if (subtitle) {
                subtitle.textContent = settings.homeHeroSubtitle || 'Исследуйте мир технологий, дизайна и инноваций вместе с нами';
            }
        }

        // About page hero
        if (path.includes('about.html')) {
            const title = document.getElementById('aboutHeroTitle');
            const subtitle = document.getElementById('aboutHeroSubtitle');

            if (title) {
                const titleText = settings.aboutTitle || 'О';
                const highlightText = settings.aboutTitleHighlight || 'Gammy Blog';
                title.innerHTML = `${titleText} <span class="gradient-text">${highlightText}</span>`;
            }
            if (subtitle) {
                subtitle.textContent = settings.aboutSubtitle || 'Современный блог о технологиях и инновациях';
            }
        }

        // Contact page hero
        if (path.includes('contact.html')) {
            const title = document.getElementById('contactHeroTitle');
            const subtitle = document.getElementById('contactHeroSubtitle');

            if (title) {
                const titleText = settings.contactTitle || 'Свяжитесь с';
                const highlightText = settings.contactTitleHighlight || 'нами';
                title.innerHTML = `${titleText} <span class="gradient-text">${highlightText}</span>`;
            }
            if (subtitle) {
                subtitle.textContent = settings.contactSubtitle || 'Есть вопросы или предложения? Мы всегда рады обратной связи';
            }
        }

        // Categories page hero
        if (path.includes('categories.html')) {
            const title = document.getElementById('categoriesHeroTitle');
            const subtitle = document.getElementById('categoriesHeroSubtitle');

            if (title) {
                const titleText = settings.categoriesTitle || 'Все';
                const highlightText = settings.categoriesTitleHighlight || 'категории';
                title.innerHTML = `${titleText} <span class="gradient-text">${highlightText}</span>`;
            }
            if (subtitle) {
                subtitle.textContent = settings.categoriesSubtitle || 'Выберите интересующую вас тему';
            }
        }
    },

    updateFooter(settings) {
        // Update footer description
        const footerDesc = document.querySelector('.footer-description');
        if (footerDesc && settings.footerDescription) {
            footerDesc.textContent = settings.footerDescription;
        }

        // Update copyright
        const copyright = document.querySelector('.footer-copyright');
        if (copyright && settings.footerCopyright) {
            copyright.textContent = settings.footerCopyright;
        }

        // Update nav links (format: "Текст|URL, Текст2|URL2")
        const footerNav = document.querySelector('.footer-nav');
        if (footerNav && settings.footerNavLinks) {
            const links = settings.footerNavLinks.split(',').map(link => {
                const [text, url] = link.trim().split('|');
                return url ? `<a href="${url.trim()}">${text.trim()}</a>` : `<a href="#">${text.trim()}</a>`;
            }).join('');
            footerNav.innerHTML = links;
        }

        // Update extra links
        const footerExtra = document.querySelector('.footer-links-extra');
        if (footerExtra && settings.footerExtraLinks) {
            const links = settings.footerExtraLinks.split(',').map(link => {
                const [text, url] = link.trim().split('|');
                return url ? `<a href="${url.trim()}">${text.trim()}</a>` : `<a href="#">${text.trim()}</a>`;
            }).join('');
            footerExtra.innerHTML = links;
        }

        // Update subscribe section
        const subscribeSection = document.querySelector('.footer-subscribe');
        if (subscribeSection) {
            if (settings.footerShowSubscribe === '0' || settings.footerShowSubscribe === false) {
                subscribeSection.style.display = 'none';
            } else {
                subscribeSection.style.display = '';
                const subscribeTitle = subscribeSection.querySelector('h4');
                const subscribeText = subscribeSection.querySelector('p');
                if (subscribeTitle && settings.footerSubscribeTitle) {
                    subscribeTitle.textContent = settings.footerSubscribeTitle;
                }
                if (subscribeText && settings.footerSubscribeText) {
                    subscribeText.textContent = settings.footerSubscribeText;
                }
            }
        }
    }
};

// ============================================
// MODALS - Auth Modals
// ============================================

const Modals = {
    init() {
        console.log('[Modals] init() called');

        // Login button
        const loginBtn = document.getElementById('loginBtn');
        console.log('[Modals] loginBtn:', loginBtn);
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('[Modals] loginBtn clicked!');
                this.showLoginModal();
            });
            console.log('[Modals] loginBtn listener attached');
        }

        // Register button
        const registerBtn = document.getElementById('registerBtn');
        console.log('[Modals] registerBtn:', registerBtn);
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                console.log('[Modals] registerBtn clicked!');
                this.showRegisterModal();
            });
            console.log('[Modals] registerBtn listener attached');
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }

        // Mobile auth buttons
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        console.log('[Modals] mobileLoginBtn:', mobileLoginBtn);
        if (mobileLoginBtn) {
            const loginHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Modals] mobileLoginBtn clicked!');
                this.showLoginModal();
                document.getElementById('mobileMenu')?.classList.remove('active');
            };
            mobileLoginBtn.addEventListener('click', loginHandler);
            mobileLoginBtn.addEventListener('touchend', loginHandler);
        }

        const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
        console.log('[Modals] mobileRegisterBtn:', mobileRegisterBtn);
        if (mobileRegisterBtn) {
            const registerHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Modals] mobileRegisterBtn clicked!');
                this.showRegisterModal();
                document.getElementById('mobileMenu')?.classList.remove('active');
            };
            mobileRegisterBtn.addEventListener('click', registerHandler);
            mobileRegisterBtn.addEventListener('touchend', registerHandler);
        }

        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', () => {
                Auth.logout();
                document.getElementById('mobileMenu')?.classList.remove('active');
            });
        }

        // User avatar dropdown
        const userAvatarBtn = document.getElementById('userAvatarBtn');
        const userMenu = document.getElementById('userMenu');
        if (userAvatarBtn && userMenu) {
            userAvatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!userMenu.contains(e.target)) {
                    userMenu.classList.remove('active');
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
                        <label for="loginEmail">Email или логин</label>
                        <input type="text" id="loginEmail" required placeholder="email или логин">
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
        const authorInitial = article.author_name ? article.author_name.charAt(0).toUpperCase() : 'A';
        const avatarContent = article.author_avatar
            ? `<img src="${article.author_avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : authorInitial;

        // Random emoji for placeholder
        const emojis = ['📝', '✨', '🎨', '💡', '🚀', '🌟', '🎯', '💬', '📚', '🔥'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        const hasImage = article.image && article.image.trim().length > 0;
        const imageContent = hasImage
            ? `<img src="${article.image}" alt="${article.title}" loading="lazy">`
            : `<div class="article-image-placeholder">${randomEmoji}</div>`;

        return `
            <article class="article-card glass">
                <a href="pages/article.html?slug=${article.slug}" class="article-image">
                    ${imageContent}
                    <span class="article-category">${UI.getCategoryName(article.category)}</span>
                </a>
                <div class="article-content">
                    <a href="pages/article.html?slug=${article.slug}" class="article-title-link">
                        <h3 class="article-title">${article.title}</h3>
                    </a>
                    <p class="article-excerpt">${UI.truncate(article.excerpt, 120)}</p>
                    <div class="article-meta">
                        <div class="article-author">
                            <div class="author-avatar">${avatarContent}</div>
                            <div class="author-info">
                                <span class="author-name">${article.author_name || 'Admin'}</span>
                                <span class="article-date">${UI.formatDate(article.created_at)}</span>
                            </div>
                        </div>
                        <div class="article-stats">
                            <span class="stat-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                ${article.views || 0}
                            </span>
                        </div>
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
        const slug = params.get('slug');
        const id = params.get('id');

        if (!slug && !id) return;

        try {
            // Use getArticle for id, getArticleBySlug for slug
            this.article = id ? await API.getArticle(id) : await API.getArticleBySlug(slug);
            this.render();
            this.loadRelatedArticles();
            this.loadComments();
            this.initCommentForm();
        } catch (err) {
            console.error('Load article error:', err);
            const page = document.querySelector('.article-page');
            if (page) page.innerHTML = '<div class="container"><p>Статья не найдена</p></div>';
        }
    },

    decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    },

    render() {
        const container = document.querySelector('.article-page');
        if (!container || !this.article) return;

        document.title = this.article.seo_title || this.article.title + ' - Gammy Blog';

        const authorInitial = this.article.author_name ? this.article.author_name.charAt(0).toUpperCase() : 'A';
        const avatarContent = this.article.author_avatar
            ? `<img src="${this.article.author_avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : authorInitial;

        // Decode HTML entities in content
        const decodedContent = this.decodeHtml(this.article.content || '');

        container.innerHTML = `
            <div class="container">
                <article class="article-full">
                    <header class="article-header">
                        <span class="article-category">${UI.getCategoryName(this.article.category)}</span>
                        <h1 class="article-title">${this.article.title}</h1>
                        <div class="article-header-meta">
                            <div class="article-author">
                                <div class="author-avatar">${avatarContent}</div>
                                <div class="author-info">
                                    <span class="author-name">${this.article.author_name || 'Admin'}</span>
                                    <span class="article-date">${UI.formatDate(this.article.created_at)}</span>
                                </div>
                            </div>
                            <div class="article-stats">
                                <span class="stat-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    ${this.article.views || 0}
                                </span>
                            </div>
                        </div>
                    </header>

                    ${this.article.image
                        ? `<img src="${this.article.image}" alt="${this.article.title}" class="article-hero-image">`
                        : `<div class="article-hero-placeholder">📖</div>`
                    }

                    <div class="article-body">
                        ${decodedContent}
                    </div>
                </article>

                <section class="related-articles-section">
                    <h3 class="section-title">Читайте также</h3>
                    <div class="related-articles-grid" id="relatedArticles"></div>
                </section>

                <section class="comments-section">
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

        // Protect external links for non-logged users
        this.initLinkProtection();
    },

    initLinkProtection() {
        const articleBody = document.querySelector('.article-body');
        if (!articleBody) return;

        articleBody.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Allow: anchors, relative paths, same domain links
            const isInternal = href.startsWith('#') ||
                               href.startsWith('/') ||
                               href.startsWith('./') ||
                               href.startsWith('../') ||
                               href.includes('gammy.space') ||
                               href.includes(window.location.hostname) ||
                               !href.includes('://');

            if (isInternal) return; // Allow internal links

            // External link - check if user is logged in
            if (!Auth.isLoggedIn()) {
                e.preventDefault();
                e.stopPropagation();
                UI.showToast('Войдите, чтобы открывать внешние ссылки', 'error');
                Modals.showLoginModal();
            }
        });
    },

    async loadRelatedArticles() {
        if (!this.article) return;

        const container = document.getElementById('relatedArticles');
        if (!container) return;

        try {
            // Get articles from same category, excluding current article
            const allArticles = await API.getArticles({ category: this.article.category, limit: 4 });
            const related = allArticles.filter(a => a.id !== this.article.id).slice(0, 3);

            if (related.length === 0) {
                // If no articles in same category, get latest articles
                const latest = await API.getArticles({ limit: 4 });
                related.push(...latest.filter(a => a.id !== this.article.id).slice(0, 3));
            }

            if (related.length === 0) {
                container.parentElement.style.display = 'none';
                return;
            }

            container.innerHTML = related.map(article => {
                const emojis = ['📝', '✨', '🎨', '💡', '🚀', '🌟', '🎯', '💬', '📚', '🔥'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                const hasImage = article.image && article.image.trim().length > 0;
                const imageContent = hasImage
                    ? `<img src="${article.image}" alt="${article.title}" loading="lazy">`
                    : `<div class="article-image-placeholder">${randomEmoji}</div>`;

                return `
                    <article class="related-article-card">
                        <a href="article.html?slug=${article.slug}" class="related-article-image">
                            ${imageContent}
                        </a>
                        <div class="related-article-content">
                            <span class="related-article-category">${UI.getCategoryName(article.category)}</span>
                            <a href="article.html?slug=${article.slug}" class="related-article-title">
                                ${article.title}
                            </a>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (err) {
            console.error('Load related articles error:', err);
            container.parentElement.style.display = 'none';
        }
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
                menu.classList.toggle('active');
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
// NOTIFICATIONS - User Notifications System
// ============================================

const Notifications = {
    pollInterval: null,
    isDropdownOpen: false,

    async init() {
        if (!Auth.isLoggedIn()) {
            this.hideWrapper();
            return;
        }

        this.showWrapper();
        this.bindEvents();
        await this.updateBadge();

        // Poll for new notifications every 30 seconds
        this.pollInterval = setInterval(() => this.updateBadge(), 30000);
    },

    showWrapper() {
        const wrapper = document.getElementById('notificationsWrapper');
        if (wrapper) wrapper.classList.remove('hidden');
    },

    hideWrapper() {
        const wrapper = document.getElementById('notificationsWrapper');
        if (wrapper) wrapper.classList.add('hidden');
    },

    bindEvents() {
        const btn = document.getElementById('notificationsBtn');
        const dropdown = document.getElementById('notificationsDropdown');

        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target) && this.isDropdownOpen) {
                this.closeDropdown();
            }
        });
    },

    async toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            await this.openDropdown();
        }
    },

    async openDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) return;

        this.isDropdownOpen = true;
        dropdown.classList.remove('hidden');
        await this.loadNotifications();
    },

    closeDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
        this.isDropdownOpen = false;
    },

    async updateBadge() {
        if (!Auth.isLoggedIn()) return;

        try {
            const data = await API.getUnreadNotificationsCount();
            const badge = document.getElementById('notificationsBadge');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count > 99 ? '99+' : data.count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (err) {
            console.error('Failed to get notifications count:', err);
        }
    },

    async loadNotifications() {
        const list = document.getElementById('notificationsList');
        if (!list) return;

        try {
            const notifications = await API.getNotifications();

            if (notifications.length === 0) {
                list.innerHTML = `
                    <div class="notifications-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>Нет уведомлений</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = notifications.map(n => this.renderNotification(n)).join('');
            this.bindNotificationEvents();
        } catch (err) {
            console.error('Failed to load notifications:', err);
            list.innerHTML = '<div class="notifications-empty"><p>Ошибка загрузки</p></div>';
        }
    },

    renderNotification(n) {
        const initial = n.source_user_name ? n.source_user_name.charAt(0).toUpperCase() : '?';
        const avatarHtml = n.source_avatar
            ? `<img src="${n.source_avatar}" alt="">`
            : initial;

        const iconClass = n.type.includes('like') ? 'like' : 'comment';
        const iconSvg = n.type.includes('like')
            ? '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

        return `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-post-id="${n.post_id || ''}" data-article-id="${n.article_id || ''}">
                <div class="notification-avatar">${avatarHtml}</div>
                <div class="notification-content">
                    <p class="notification-message">${this.escapeHtml(n.message)}</p>
                    <span class="notification-time">${UI.timeAgo(n.created_at)}</span>
                </div>
                <div class="notification-icon ${iconClass}">${iconSvg}</div>
            </div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindNotificationEvents() {
        const items = document.querySelectorAll('.notification-item');
        items.forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const postId = item.dataset.postId;
                const articleId = item.dataset.articleId;

                // Mark as read
                if (item.classList.contains('unread')) {
                    try {
                        await API.markNotificationAsRead(id);
                        item.classList.remove('unread');
                        this.updateBadge();
                    } catch (err) {
                        console.error('Failed to mark as read:', err);
                    }
                }

                // Navigate to content
                if (postId) {
                    window.location.href = `/pages/post.html?id=${postId}`;
                } else if (articleId) {
                    window.location.href = `/pages/article.html?id=${articleId}`;
                }
            });
        });
    },

    async markAllAsRead() {
        try {
            await API.markAllNotificationsAsRead();
            const items = document.querySelectorAll('.notification-item.unread');
            items.forEach(item => item.classList.remove('unread'));
            this.updateBadge();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    },

    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
};

// ============================================
// CURSOR GLOW - Soft warm light effect
// ============================================

const CursorGlow = {
    element: null,
    mouseX: 0,
    mouseY: 0,
    currentX: 0,
    currentY: 0,
    animationId: null,

    init() {
        // Don't init on mobile/touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return;
        }

        this.createGlowElement();
        this.bindEvents();
        this.animate();
    },

    createGlowElement() {
        this.element = document.createElement('div');
        this.element.className = 'cursor-glow';
        document.body.appendChild(this.element);
    },

    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Hide when mouse leaves window
        document.addEventListener('mouseleave', () => {
            if (this.element) this.element.style.opacity = '0';
        });

        document.addEventListener('mouseenter', () => {
            if (this.element) this.element.style.opacity = '1';
        });
    },

    animate() {
        // Smooth follow with easing
        const ease = 0.15;
        this.currentX += (this.mouseX - this.currentX) * ease;
        this.currentY += (this.mouseY - this.currentY) * ease;

        if (this.element) {
            this.element.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    },

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.element) {
            this.element.remove();
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Gammy] DOMContentLoaded fired');

    // Init core modules
    Theme.init();
    CursorGlow.init();
    console.log('[Gammy] Theme initialized');

    MobileMenu.init();
    console.log('[Gammy] MobileMenu initialized');

    Modals.init();
    console.log('[Gammy] Modals initialized');

    UI.init();
    console.log('[Gammy] UI initialized (footer categories)');

    // Init auth
    await Auth.init();
    console.log('[Gammy] Auth initialized, _initialized:', Auth._initialized);

    // Init notifications
    await Notifications.init();
    console.log('[Gammy] Notifications initialized');

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

    // Init Feed if container exists (for index.html with feed)
    const feedContainer = document.getElementById('postsFeed') || document.getElementById('feedPosts');
    console.log('[Gammy] Feed container:', feedContainer);
    console.log('[Gammy] window.Feed:', window.Feed);

    if (feedContainer) {
        // Wait for Feed to be defined (feed.js loads after app.js)
        let waitAttempts = 0;
        while (!window.Feed && waitAttempts < 50) {
            await new Promise(r => setTimeout(r, 50));
            waitAttempts++;
        }

        if (window.Feed) {
            console.log('[Gammy] Initializing Feed...');
            await window.Feed.init();
            console.log('[Gammy] Feed initialized');
        } else {
            console.error('[Gammy] Feed not found after waiting');
        }
    }
});

// Export for global access
window.Auth = Auth;
window.UI = UI;
window.Modals = Modals;
window.Articles = Articles;
window.ArticlePage = ArticlePage;
window.Notifications = Notifications;
