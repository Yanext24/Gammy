/**
 * Gammy Blog - Admin Panel JavaScript
 * Updated to work with API
 */

const Admin = {
    currentSection: 'dashboard',
    editingArticleId: null,
    editingCategoryId: null,
    currentArticleImage: null,

    init() {
        // Check admin access
        if (!Auth.isAdmin()) {
            window.location.href = '../index.html';
            return;
        }

        this.initNavigation();
        this.initEditor();
        this.initCategoryForm();
        this.loadCategorySelect();
        this.loadDashboard();
        this.initImageUpload();

        const hash = window.location.hash.slice(1);
        if (hash) {
            this.showSection(hash);
        }
    },

    // ============================================
    // NAVIGATION
    // ============================================

    initNavigation() {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
    },

    showSection(section) {
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.add('hidden');
        });

        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        window.location.hash = section;
        this.currentSection = section;

        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'articles':
                this.loadArticles();
                break;
            case 'new-article':
                if (!this.editingArticleId) {
                    this.resetArticleForm();
                }
                break;
            case 'comments':
                this.loadComments();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'seo':
                this.loadSeoSettings();
                break;
            case 'site-settings':
                this.loadSiteSettings();
                break;
            case 'media':
                this.loadMedia();
                break;
            case 'page-content':
                this.loadPageContent();
                break;
            case 'feed-stats':
                this.loadFeedStats();
                break;
            case 'feed-settings':
                this.loadFeedSettings();
                break;
        }
    },

    // ============================================
    // DASHBOARD
    // ============================================

    async loadDashboard() {
        try {
            const [articles, users, comments, stats] = await Promise.all([
                API.getArticlesAdmin().catch(() => []),
                API.getUsers().catch(() => []),
                API.getAllComments().catch(() => []),
                API.getArticlesStats().catch(() => ({}))
            ]);

            document.getElementById('totalArticles').textContent = articles.length || 0;
            document.getElementById('totalViews').textContent = stats.totalViews || 0;
            document.getElementById('totalComments').textContent = comments.length || 0;
            document.getElementById('totalUsers').textContent = users.length || 0;

            const tableBody = document.getElementById('recentArticlesTable');
            if (tableBody && articles.length) {
                const recentArticles = articles.slice(0, 5);
                tableBody.innerHTML = recentArticles.map(article => `
                    <tr>
                        <td>${UI.truncate(article.title, 40)}</td>
                        <td>${article.category_name || article.category}</td>
                        <td><span class="status-badge ${article.status}">${article.status === 'published' ? 'Опубликовано' : 'Черновик'}</span></td>
                        <td>${UI.formatDate(article.created_at)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="table-action-btn" data-action="edit-article" data-id="${article.id}" title="Редактировать">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="table-action-btn delete" data-action="delete-article" data-id="${article.id}" title="Удалить">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Add event delegation for dashboard article actions (only once)
                if (!tableBody.dataset.delegated) {
                    tableBody.dataset.delegated = 'true';
                    tableBody.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-action]');
                        if (!btn) return;

                        const action = btn.dataset.action;
                        const id = parseInt(btn.dataset.id, 10);

                        switch (action) {
                            case 'edit-article':
                                this.editArticle(id);
                                break;
                            case 'delete-article':
                                this.deleteArticle(id);
                                break;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
        }
    },

    // ============================================
    // ARTICLES
    // ============================================

    async loadArticles() {
        try {
            const articles = await API.getArticlesAdmin();
            const tableBody = document.getElementById('articlesTable');

            if (tableBody) {
                tableBody.innerHTML = articles.map(article => `
                    <tr>
                        <td>${UI.truncate(article.title, 50)}</td>
                        <td>${article.category_name || article.category}</td>
                        <td><span class="status-badge ${article.status}">${article.status === 'published' ? 'Опубликовано' : 'Черновик'}</span></td>
                        <td>${article.views || 0}</td>
                        <td>${UI.formatDate(article.created_at)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="table-action-btn" data-action="view-article" data-id="${article.id}" title="Просмотр">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                                <button class="table-action-btn" data-action="edit-article" data-id="${article.id}" title="Редактировать">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="table-action-btn delete" data-action="delete-article" data-id="${article.id}" title="Удалить">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Add event delegation for article actions (only once)
                if (!tableBody.dataset.delegated) {
                    tableBody.dataset.delegated = 'true';
                    tableBody.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-action]');
                        if (!btn) return;

                        const action = btn.dataset.action;
                        const id = parseInt(btn.dataset.id, 10);

                        switch (action) {
                            case 'view-article':
                                this.viewArticle(id);
                                break;
                            case 'edit-article':
                                this.editArticle(id);
                                break;
                            case 'delete-article':
                                this.deleteArticle(id);
                                break;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Articles load error:', err);
            UI.showToast('Ошибка загрузки статей', 'error');
        }
    },

    viewArticle(id) {
        window.open(`article.html?id=${id}`, '_blank');
    },

    async editArticle(id) {
        try {
            const article = await API.getArticle(id);
            if (!article) return;

            this.editingArticleId = id;
            document.getElementById('editorTitle').textContent = 'Редактировать статью';

            document.getElementById('articleId').value = id;
            document.getElementById('articleTitleInput').value = article.title;
            document.getElementById('articleCategorySelect').value = article.category;
            document.getElementById('articleStatus').value = article.status;
            document.getElementById('articleImage').value = article.image || '';
            document.getElementById('articleExcerpt').value = article.excerpt || '';
            document.getElementById('editorContent').innerHTML = article.content || '';

            document.getElementById('seoTitle').value = article.seo_title || '';
            document.getElementById('seoDescription').value = article.seo_description || '';
            document.getElementById('seoKeywords').value = article.seo_keywords || '';
            document.getElementById('seoSlug').value = article.slug || '';

            if (article.image) {
                this.currentArticleImage = article.image;
                this.setArticleImagePreview(article.image);
            } else {
                this.currentArticleImage = null;
                this.hideArticleImagePreview();
            }

            this.showSection('new-article');
        } catch (err) {
            console.error('Edit article error:', err);
            UI.showToast('Ошибка загрузки статьи', 'error');
        }
    },

    async deleteArticle(id) {
        if (confirm('Вы уверены, что хотите удалить эту статью?')) {
            try {
                await API.deleteArticle(id);
                UI.showToast('Статья удалена');
                this.loadArticles();
                this.loadDashboard();
            } catch (err) {
                UI.showToast('Ошибка удаления', 'error');
            }
        }
    },

    // ============================================
    // RICH TEXT EDITOR
    // ============================================

    initEditor() {
        const toolbar = document.querySelector('.editor-toolbar');
        const editor = document.getElementById('editorContent');

        if (!toolbar || !editor) return;

        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                const value = btn.dataset.value || null;

                if (command === 'createLink') {
                    const url = prompt('Введите URL:');
                    if (url) {
                        document.execCommand(command, false, url);
                    }
                } else if (command === 'insertImage') {
                    const url = prompt('Введите URL изображения:');
                    if (url) {
                        document.execCommand(command, false, url);
                    }
                } else {
                    document.execCommand(command, false, value);
                }

                editor.focus();
            });
        });

        // Upload image button for editor
        const uploadImageBtn = document.getElementById('uploadImageBtn');
        const editorImageUpload = document.getElementById('editorImageUpload');

        if (uploadImageBtn && editorImageUpload) {
            uploadImageBtn.addEventListener('click', () => {
                editorImageUpload.click();
            });

            editorImageUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    UI.showToast('Файл слишком большой (макс. 5MB)', 'error');
                    return;
                }

                try {
                    UI.showToast('Загрузка...', 'info');
                    const result = await API.uploadMedia(file);

                    // Insert image at cursor position in editor
                    const editor = document.getElementById('editorContent');
                    editor.focus();

                    const img = document.createElement('img');
                    img.src = result.path;
                    img.alt = file.name;
                    img.style.maxWidth = '100%';

                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(img);
                        range.setStartAfter(img);
                        range.setEndAfter(img);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        editor.appendChild(img);
                    }

                    UI.showToast('Изображение загружено!', 'success');
                } catch (err) {
                    UI.showToast('Ошибка загрузки: ' + err.message, 'error');
                }

                // Reset input
                editorImageUpload.value = '';
            });
        }

        // Toggle HTML mode button
        const toggleHtmlBtn = document.getElementById('toggleHtmlBtn');
        const editorHtmlSource = document.getElementById('editorHtmlSource');
        let isHtmlMode = false;

        if (toggleHtmlBtn && editorHtmlSource) {
            toggleHtmlBtn.addEventListener('click', () => {
                isHtmlMode = !isHtmlMode;

                if (isHtmlMode) {
                    // Switch to HTML mode
                    editorHtmlSource.value = editor.innerHTML;
                    editor.style.display = 'none';
                    editorHtmlSource.style.display = 'block';
                    toggleHtmlBtn.style.background = 'var(--accent-primary)';
                    toggleHtmlBtn.style.color = 'white';
                } else {
                    // Switch back to visual mode
                    editor.innerHTML = editorHtmlSource.value;
                    editor.style.display = 'block';
                    editorHtmlSource.style.display = 'none';
                    toggleHtmlBtn.style.background = '';
                    toggleHtmlBtn.style.color = '';
                }
            });
        }

        const articleForm = document.getElementById('articleForm');
        if (articleForm) {
            articleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // Sync HTML source to editor before saving
                if (isHtmlMode && editorHtmlSource) {
                    editor.innerHTML = editorHtmlSource.value;
                }
                this.saveArticle();
            });
        }
    },

    async saveArticle() {
        const user = Auth.getCurrentUser();
        const imageUrl = this.currentArticleImage || document.getElementById('articleImage').value;

        const articleData = {
            title: document.getElementById('articleTitleInput').value,
            category: document.getElementById('articleCategorySelect').value,
            status: document.getElementById('articleStatus').value,
            image: imageUrl,
            excerpt: document.getElementById('articleExcerpt').value,
            content: document.getElementById('editorContent').innerHTML,
            slug: document.getElementById('seoSlug').value || this.generateSlug(document.getElementById('articleTitleInput').value),
            seo_title: document.getElementById('seoTitle').value,
            seo_description: document.getElementById('seoDescription').value,
            seo_keywords: document.getElementById('seoKeywords').value
        };

        if (!articleData.title || !articleData.category || !articleData.content) {
            UI.showToast('Заполните обязательные поля', 'error');
            return;
        }

        try {
            if (this.editingArticleId) {
                await API.updateArticle(this.editingArticleId, articleData);
                UI.showToast('Статья обновлена!');
            } else {
                await API.createArticle(articleData);
                UI.showToast('Статья создана!');
            }

            this.resetArticleForm();
            this.showSection('articles');
        } catch (err) {
            UI.showToast('Ошибка сохранения: ' + err.message, 'error');
        }
    },

    generateSlug(title) {
        const translitMap = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
            'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };

        return title
            .toLowerCase()
            .split('')
            .map(char => translitMap[char] || char)
            .join('')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    },

    resetArticleForm() {
        this.editingArticleId = null;
        this.currentArticleImage = null;
        document.getElementById('editorTitle').textContent = 'Новая статья';
        document.getElementById('articleForm').reset();
        document.getElementById('editorContent').innerHTML = '';
        document.getElementById('articleId').value = '';
        this.hideArticleImagePreview();
        this.switchImageMode('article', 'url');
    },

    // ============================================
    // COMMENTS
    // ============================================

    async loadComments() {
        try {
            const comments = await API.getAllComments();
            const tableBody = document.getElementById('commentsTable');

            if (tableBody) {
                // Determine comment type based on available fields
                const getCommentType = (comment) => {
                    if (comment.type) return comment.type;
                    if (comment.post_id) return 'post';
                    if (comment.article_id || comment.article_title) return 'article';
                    return 'article'; // default
                };

                tableBody.innerHTML = comments.map(comment => {
                    const commentType = getCommentType(comment);
                    const authorName = comment.author_name || comment.name || 'Аноним';
                    const authorEmail = comment.author_email || comment.email || '';
                    const commentText = UI.truncate(comment.text || comment.content, 50);
                    const targetTitle = comment.article_title || comment.post_id || '-';

                    return `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="comment-avatar" style="width: 36px; height: 36px; font-size: 14px;">${authorName.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 500;">${authorName}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${authorEmail}</div>
                                </div>
                            </div>
                        </td>
                        <td>${commentText}</td>
                        <td>${targetTitle}</td>
                        <td>${UI.formatDate(comment.created_at)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="table-action-btn delete" data-action="delete-comment" data-id="${comment.id}" data-type="${commentType}" title="Удалить">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('');

                // Add event delegation for comment actions (only once)
                if (!tableBody.dataset.delegated) {
                    tableBody.dataset.delegated = 'true';
                    tableBody.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-action="delete-comment"]');
                        if (btn) {
                            const id = parseInt(btn.dataset.id, 10);
                            const type = btn.dataset.type;
                            this.deleteComment(id, type);
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Comments load error:', err);
        }
    },

    async deleteComment(id, type) {
        if (confirm('Удалить этот комментарий?')) {
            try {
                if (type === 'post') {
                    await API.deletePostComment(id);
                } else {
                    await API.deleteArticleComment(id);
                }
                UI.showToast('Комментарий удалён');
                this.loadComments();
            } catch (err) {
                UI.showToast('Ошибка удаления', 'error');
            }
        }
    },

    // ============================================
    // USERS
    // ============================================

    async loadUsers() {
        try {
            const users = await API.getUsers();
            const tableBody = document.getElementById('usersTable');

            if (tableBody) {
                tableBody.innerHTML = users.map(user => `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="comment-avatar" style="width: 36px; height: 36px; font-size: 14px;">${user.name.charAt(0).toUpperCase()}</div>
                                <span>${user.name}</span>
                            </div>
                        </td>
                        <td>${user.email}</td>
                        <td><span class="status-badge ${user.role === 'admin' ? 'published' : ''}">${user.role === 'admin' ? 'Админ' : 'Пользователь'}</span></td>
                        <td>${UI.formatDate(user.created_at)}</td>
                        <td>
                            <div class="table-actions">
                                ${user.role !== 'admin' ? `
                                    <button class="table-action-btn" data-action="make-admin" data-id="${user.id}" title="Сделать админом">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                    </button>
                                    <button class="table-action-btn delete" data-action="delete-user" data-id="${user.id}" title="Удалить">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');

                // Add event delegation for user actions (only once)
                if (!tableBody.dataset.delegated) {
                    tableBody.dataset.delegated = 'true';
                    tableBody.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-action]');
                        if (!btn) return;

                        const action = btn.dataset.action;
                        const id = parseInt(btn.dataset.id, 10);

                        switch (action) {
                            case 'make-admin':
                                this.makeAdmin(id);
                                break;
                            case 'delete-user':
                                this.deleteUser(id);
                                break;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Users load error:', err);
        }
    },

    async makeAdmin(id) {
        if (confirm('Сделать этого пользователя администратором?')) {
            try {
                await API.updateUserRole(id, 'admin');
                UI.showToast('Пользователь теперь админ');
                this.loadUsers();
            } catch (err) {
                UI.showToast('Ошибка', 'error');
            }
        }
    },

    async deleteUser(id) {
        if (confirm('Удалить этого пользователя?')) {
            try {
                await API.deleteUser(id);
                UI.showToast('Пользователь удалён');
                this.loadUsers();
            } catch (err) {
                UI.showToast('Ошибка удаления', 'error');
            }
        }
    },

    // ============================================
    // CATEGORIES
    // ============================================

    async loadCategories() {
        try {
            const categories = await API.getCategories();
            const grid = document.getElementById('categoryGrid');

            if (grid) {
                grid.innerHTML = categories.map(cat => `
                    <div class="category-card">
                        <div class="category-card-icon" style="background: ${cat.color};">
                            ${cat.icon || ''}
                        </div>
                        <div class="category-card-content">
                            <h3 class="category-card-name">${cat.name}</h3>
                            <span class="category-card-slug">${cat.slug}</span>
                        </div>
                        <div class="category-card-actions">
                            <button class="table-action-btn" data-action="edit-category" data-id="${cat.id}" title="Редактировать">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="table-action-btn delete" data-action="delete-category" data-id="${cat.id}" title="Удалить">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('');

                // Add event delegation for category actions (only once)
                if (!grid.dataset.delegated) {
                    grid.dataset.delegated = 'true';
                    grid.addEventListener('click', (e) => {
                        const btn = e.target.closest('[data-action]');
                        if (!btn) return;

                        const action = btn.dataset.action;
                        const id = parseInt(btn.dataset.id, 10);

                        switch (action) {
                            case 'edit-category':
                                this.editCategory(id);
                                break;
                            case 'delete-category':
                                this.deleteCategory(id);
                                break;
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Categories load error:', err);
        }
    },

    async loadCategorySelect() {
        try {
            const categories = await API.getCategories();
            const select = document.getElementById('articleCategorySelect');

            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Выберите категорию</option>';
                categories.forEach(cat => {
                    select.innerHTML += `<option value="${cat.slug}">${cat.name}</option>`;
                });
                if (currentValue) {
                    select.value = currentValue;
                }
            }
        } catch (err) {
            console.error('Category select load error:', err);
        }
    },

    initCategoryForm() {
        const form = document.getElementById('categoryForm');
        const iconInput = document.getElementById('categoryIcon');
        const colorInput = document.getElementById('categoryColor');
        const colorTextInput = document.getElementById('categoryColorText');
        const preview = document.getElementById('iconPreview');

        if (!form) return;

        if (colorInput && colorTextInput) {
            colorInput.addEventListener('input', () => {
                colorTextInput.value = colorInput.value;
            });
            colorTextInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(colorTextInput.value)) {
                    colorInput.value = colorTextInput.value;
                }
            });
        }

        if (iconInput && preview) {
            iconInput.addEventListener('input', () => {
                preview.innerHTML = iconInput.value;
                const svg = preview.querySelector('svg');
                if (svg) {
                    svg.style.width = '24px';
                    svg.style.height = '24px';
                }
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });
    },

    async showCategoryModal(id = null) {
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('categoryModalTitle');

        this.editingCategoryId = id;

        if (id) {
            title.textContent = 'Редактировать категорию';
            try {
                const categories = await API.getCategories();
                const cat = categories.find(c => c.id === id);
                if (cat) {
                    document.getElementById('categoryId').value = cat.id;
                    document.getElementById('categoryName').value = cat.name;
                    document.getElementById('categorySlug').value = cat.slug;
                    document.getElementById('categoryColor').value = cat.color || '#6366f1';
                    document.getElementById('categoryColorText').value = cat.color || '#6366f1';
                    document.getElementById('categoryIcon').value = cat.icon || '';
                    document.getElementById('iconPreview').innerHTML = cat.icon || '';
                    document.getElementById('categoryShowOnHome').checked = !!cat.show_on_home;
                    document.getElementById('categoryShowInFooter').checked = cat.show_in_footer !== 0;
                }
            } catch (err) {
                console.error('Category load error:', err);
            }
        } else {
            title.textContent = 'Добавить категорию';
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryColor').value = '#6366f1';
            document.getElementById('categoryColorText').value = '#6366f1';
            document.getElementById('iconPreview').innerHTML = '';
            document.getElementById('categoryShowOnHome').checked = false;
            document.getElementById('categoryShowInFooter').checked = true;
        }

        modal.classList.add('active');
    },

    closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        modal.classList.remove('active');
        this.editingCategoryId = null;
    },

    editCategory(id) {
        this.showCategoryModal(id);
    },

    async saveCategory() {
        const categoryData = {
            name: document.getElementById('categoryName').value,
            slug: document.getElementById('categorySlug').value,
            color: document.getElementById('categoryColor').value,
            icon: document.getElementById('categoryIcon').value,
            show_on_home: document.getElementById('categoryShowOnHome').checked ? 1 : 0,
            show_in_footer: document.getElementById('categoryShowInFooter').checked ? 1 : 0
        };

        if (!categoryData.name || !categoryData.slug) {
            UI.showToast('Заполните название и slug', 'error');
            return;
        }

        try {
            if (this.editingCategoryId) {
                await API.updateCategory(this.editingCategoryId, categoryData);
                UI.showToast('Категория обновлена!');
            } else {
                await API.createCategory(categoryData);
                UI.showToast('Категория создана!');
            }

            this.closeCategoryModal();
            this.loadCategories();
            this.loadCategorySelect();
        } catch (err) {
            UI.showToast('Ошибка: ' + err.message, 'error');
        }
    },

    async deleteCategory(id) {
        if (confirm('Удалить эту категорию?')) {
            try {
                await API.deleteCategory(id);
                UI.showToast('Категория удалена');
                this.loadCategories();
                this.loadCategorySelect();
            } catch (err) {
                UI.showToast('Ошибка удаления', 'error');
            }
        }
    },

    // ============================================
    // SEO SETTINGS
    // ============================================

    async loadSeoSettings() {
        try {
            const settings = await API.getSettings();

            document.getElementById('siteName').value = settings.siteName || '';
            document.getElementById('siteDescription').value = settings.siteDescription || '';
            document.getElementById('siteKeywords').value = settings.siteKeywords || '';
            document.getElementById('siteAuthor').value = settings.siteAuthor || '';
            document.getElementById('ogImage').value = settings.ogImage || '';
            document.getElementById('ogType').value = settings.ogType || 'website';
            document.getElementById('siteDomain').value = settings.siteDomain || 'https://gammy.space';

            // Default robots.txt content
            const defaultRobots = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${settings.siteDomain || 'https://gammy.space'}/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin and API
Disallow: /api/
Disallow: /pages/admin.html

# Allow all content pages
Allow: /pages/
Allow: /blog.html
Allow: /index.html
Allow: /pages/post.html
Allow: /pages/article.html
Allow: /pages/categories.html
Allow: /pages/about.html
Allow: /pages/contact.html`;

            document.getElementById('robotsTxt').value = settings.robotsTxt || defaultRobots;

            const form = document.getElementById('seoSettingsForm');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    this.saveSeoSettings();
                };
            }
        } catch (err) {
            console.error('SEO settings load error:', err);
        }
    },

    async saveSeoSettings() {
        const settings = {
            siteName: document.getElementById('siteName').value,
            siteDescription: document.getElementById('siteDescription').value,
            siteKeywords: document.getElementById('siteKeywords').value,
            siteAuthor: document.getElementById('siteAuthor').value,
            ogImage: document.getElementById('ogImage').value,
            ogType: document.getElementById('ogType').value,
            siteDomain: document.getElementById('siteDomain').value,
            robotsTxt: document.getElementById('robotsTxt').value
        };

        try {
            await API.saveSettings(settings);
            UI.showToast('SEO настройки сохранены!');
        } catch (err) {
            UI.showToast('Ошибка сохранения', 'error');
        }
    },

    // ============================================
    // SITE SETTINGS
    // ============================================

    async loadSiteSettings() {
        try {
            const settings = await API.getSettings();

            document.getElementById('brandSiteName').value = settings.brandSiteName || 'Gammy';
            document.getElementById('brandSiteTagline').value = settings.brandSiteTagline || 'Blog';
            document.getElementById('brandLogoIcon').value = settings.brandLogoIcon || 'G';

            document.getElementById('accentColor1').value = settings.accentColor1 || '#6366f1';
            document.getElementById('accentColor1Text').value = settings.accentColor1 || '#6366f1';
            document.getElementById('accentColor2').value = settings.accentColor2 || '#8b5cf6';
            document.getElementById('accentColor2Text').value = settings.accentColor2 || '#8b5cf6';
            document.getElementById('accentColor3').value = settings.accentColor3 || '#a855f7';
            document.getElementById('accentColor3Text').value = settings.accentColor3 || '#a855f7';

            // 404 page settings
            document.getElementById('error404Title').value = settings.error404_title || 'Страница не найдена';
            document.getElementById('error404Description').value = settings.error404_description || 'К сожалению, запрашиваемая страница не существует или была перемещена.';

            this.updateGradientPreview();
            this.updateBrandPreview();
            this.initColorSync();
            this.initLogoTypeSwitch();

            const form = document.getElementById('siteSettingsForm');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    this.saveSiteSettings();
                };
            }
        } catch (err) {
            console.error('Site settings load error:', err);
        }
    },

    initColorSync() {
        const pairs = [
            ['accentColor1', 'accentColor1Text'],
            ['accentColor2', 'accentColor2Text'],
            ['accentColor3', 'accentColor3Text']
        ];

        pairs.forEach(([colorId, textId]) => {
            const colorInput = document.getElementById(colorId);
            const textInput = document.getElementById(textId);

            if (colorInput && textInput) {
                colorInput.addEventListener('input', () => {
                    textInput.value = colorInput.value;
                    this.updateGradientPreview();
                });

                textInput.addEventListener('input', () => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                        colorInput.value = textInput.value;
                        this.updateGradientPreview();
                    }
                });
            }
        });

        document.getElementById('brandSiteName')?.addEventListener('input', () => this.updateBrandPreview());
        document.getElementById('brandLogoIcon')?.addEventListener('input', () => this.updateBrandPreview());
    },

    initLogoTypeSwitch() {
        const radioButtons = document.querySelectorAll('input[name="logoType"]');
        const textSettings = document.getElementById('logoTextSettings');
        const imageSettings = document.getElementById('logoImageSettings');
        const logoInput = document.getElementById('logoImageInput');
        const logoPreview = document.getElementById('logoPreview');
        const logoPreviewImg = document.getElementById('logoPreviewImg');

        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'text') {
                    if (textSettings) textSettings.style.display = 'block';
                    if (imageSettings) imageSettings.style.display = 'none';
                } else {
                    if (textSettings) textSettings.style.display = 'none';
                    if (imageSettings) imageSettings.style.display = 'block';
                }
            });
        });

        if (logoInput) {
            logoInput.addEventListener('change', async () => {
                const file = logoInput.files[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    UI.showToast('Файл слишком большой (макс. 5MB)', 'error');
                    return;
                }

                try {
                    const result = await API.uploadMedia(file);
                    if (logoPreviewImg) logoPreviewImg.src = result.path;
                    if (logoPreview) logoPreview.style.display = 'block';
                    document.querySelector('.upload-placeholder')?.style.setProperty('display', 'none');
                } catch (err) {
                    UI.showToast('Ошибка загрузки', 'error');
                }
            });
        }
    },

    updateGradientPreview() {
        const color1 = document.getElementById('accentColor1').value;
        const color2 = document.getElementById('accentColor2').value;
        const color3 = document.getElementById('accentColor3').value;
        const preview = document.getElementById('gradientPreview');

        if (preview) {
            preview.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`;
        }
    },

    updateBrandPreview() {
        const name = document.getElementById('brandSiteName')?.value || 'Gammy';
        const icon = document.getElementById('brandLogoIcon')?.value || name.charAt(0);

        const previewIcon = document.getElementById('logoPreviewIcon');
        const previewText = document.getElementById('logoPreviewText');

        if (previewIcon) previewIcon.textContent = icon;
        if (previewText) previewText.textContent = name;
    },

    removeLogo() {
        const preview = document.getElementById('logoPreview');
        const previewImg = document.getElementById('logoPreviewImg');
        const input = document.getElementById('logoImageInput');

        if (preview) preview.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (input) input.value = '';
    },

    setThemePreset(preset) {
        const presets = {
            purple: { c1: '#6366f1', c2: '#8b5cf6', c3: '#a855f7' },
            blue: { c1: '#3b82f6', c2: '#0ea5e9', c3: '#06b6d4' },
            green: { c1: '#10b981', c2: '#14b8a6', c3: '#06b6d4' },
            orange: { c1: '#f59e0b', c2: '#f97316', c3: '#ef4444' },
            pink: { c1: '#ec4899', c2: '#f472b6', c3: '#e879f9' },
            red: { c1: '#ef4444', c2: '#f43f5e', c3: '#e11d48' }
        };

        const colors = presets[preset];
        if (!colors) return;

        document.getElementById('accentColor1').value = colors.c1;
        document.getElementById('accentColor1Text').value = colors.c1;
        document.getElementById('accentColor2').value = colors.c2;
        document.getElementById('accentColor2Text').value = colors.c2;
        document.getElementById('accentColor3').value = colors.c3;
        document.getElementById('accentColor3Text').value = colors.c3;

        this.updateGradientPreview();
    },

    async saveSiteSettings() {
        const settings = {
            brandSiteName: document.getElementById('brandSiteName').value,
            brandSiteTagline: document.getElementById('brandSiteTagline').value,
            brandLogoIcon: document.getElementById('brandLogoIcon').value,
            accentColor1: document.getElementById('accentColor1').value,
            accentColor2: document.getElementById('accentColor2').value,
            accentColor3: document.getElementById('accentColor3').value,
            error404_title: document.getElementById('error404Title').value,
            error404_description: document.getElementById('error404Description').value
        };

        try {
            await API.saveSettings(settings);
            UI.showToast('Настройки сохранены!');
        } catch (err) {
            UI.showToast('Ошибка сохранения', 'error');
        }
    },

    // ============================================
    // MEDIA
    // ============================================

    async loadMedia() {
        try {
            const images = await API.getMedia();
            const grid = document.getElementById('mediaGrid');

            if (grid) {
                if (images.length === 0) {
                    grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px; grid-column: 1 / -1;">Изображения не загружены</p>';
                } else {
                    grid.innerHTML = images.map(img => `
                        <div class="media-item">
                            <img src="${img.path}" alt="${img.filename}">
                            <div class="media-item-overlay">
                                <button class="media-item-btn" data-action="copy-url" data-url="${img.path}" title="Копировать URL">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button class="media-item-btn delete" data-action="delete-media" data-id="${img.id}" title="Удалить">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="media-item-name">${img.filename}</div>
                        </div>
                    `).join('');

                    // Add event delegation for media actions (only once)
                    if (!grid.dataset.delegated) {
                        grid.dataset.delegated = 'true';
                        grid.addEventListener('click', (e) => {
                            const btn = e.target.closest('[data-action]');
                            if (!btn) return;

                            const action = btn.dataset.action;

                            switch (action) {
                                case 'copy-url':
                                    this.copyImageUrl(btn.dataset.url);
                                    break;
                                case 'delete-media':
                                    this.deleteMediaItem(parseInt(btn.dataset.id, 10));
                                    break;
                            }
                        });
                    }
                }
            }

            this.initMediaUpload();
        } catch (err) {
            console.error('Media load error:', err);
        }
    },

    initMediaUpload() {
        const uploadZone = document.getElementById('mediaUploadZone');
        const fileInput = document.getElementById('mediaFileInput');

        if (!uploadZone || !fileInput) return;

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            this.handleMediaFiles(files);
        });

        fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files);
            this.handleMediaFiles(files);
            fileInput.value = '';
        });
    },

    async handleMediaFiles(files) {
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                UI.showToast(`${file.name} слишком большой (макс. 5MB)`, 'error');
                continue;
            }

            try {
                await API.uploadMedia(file);
            } catch (err) {
                UI.showToast(`Ошибка загрузки ${file.name}`, 'error');
            }
        }

        if (files.length > 0) {
            UI.showToast(`Загружено: ${files.length} изображ.`);
            this.loadMedia();
        }
    },

    copyImageUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            UI.showToast('URL скопирован!');
        }).catch(() => {
            UI.showToast('Не удалось скопировать', 'error');
        });
    },

    async deleteMediaItem(id) {
        if (confirm('Удалить это изображение?')) {
            try {
                await API.deleteMedia(id);
                UI.showToast('Изображение удалено');
                this.loadMedia();
            } catch (err) {
                UI.showToast('Ошибка удаления', 'error');
            }
        }
    },

    // ============================================
    // PAGE CONTENT
    // ============================================

    async loadPageContent() {
        try {
            const settings = await API.getSettings();

            // Home
            document.getElementById('homeHeroTitle').value = settings.homeHeroTitle || '';
            document.getElementById('homeHeroTitleHighlight').value = settings.homeHeroTitleHighlight || '';
            document.getElementById('homeHeroSubtitle').value = settings.homeHeroSubtitle || '';
            document.getElementById('homeSeoTitle').value = settings.homeSeoTitle || '';
            document.getElementById('homeSeoDescription').value = settings.homeSeoDescription || '';
            document.getElementById('homeSeoKeywords').value = settings.homeSeoKeywords || '';

            // About
            document.getElementById('aboutTitle').value = settings.aboutTitle || '';
            document.getElementById('aboutTitleHighlight').value = settings.aboutTitleHighlight || '';
            document.getElementById('aboutSubtitle').value = settings.aboutSubtitle || '';
            document.getElementById('aboutContent').value = settings.aboutContent || '';
            document.getElementById('aboutSeoTitle').value = settings.aboutSeoTitle || '';
            document.getElementById('aboutSeoDescription').value = settings.aboutSeoDescription || '';
            document.getElementById('aboutSeoKeywords').value = settings.aboutSeoKeywords || '';

            // Contact
            document.getElementById('contactTitle').value = settings.contactTitle || '';
            document.getElementById('contactTitleHighlight').value = settings.contactTitleHighlight || '';
            document.getElementById('contactSubtitle').value = settings.contactSubtitle || '';
            document.getElementById('contactEmail').value = settings.contactEmail || '';
            document.getElementById('contactPhone').value = settings.contactPhone || '';
            document.getElementById('contactAddress').value = settings.contactAddress || '';
            document.getElementById('contactResponseTime').value = settings.contactResponseTime || '';

            // Socials
            document.getElementById('socialTelegram').value = settings.socialTelegram || '';
            document.getElementById('socialVk').value = settings.socialVk || '';
            document.getElementById('socialYoutube').value = settings.socialYoutube || '';
            document.getElementById('socialGithub').value = settings.socialGithub || '';
            document.getElementById('socialTwitter').value = settings.socialTwitter || '';
            document.getElementById('socialInstagram').value = settings.socialInstagram || '';

            document.getElementById('contactSeoTitle').value = settings.contactSeoTitle || '';
            document.getElementById('contactSeoDescription').value = settings.contactSeoDescription || '';
            document.getElementById('contactSeoKeywords').value = settings.contactSeoKeywords || '';

            // Categories
            document.getElementById('categoriesTitle').value = settings.categoriesTitle || '';
            document.getElementById('categoriesTitleHighlight').value = settings.categoriesTitleHighlight || '';
            document.getElementById('categoriesSubtitle').value = settings.categoriesSubtitle || '';
            document.getElementById('categoriesSeoTitle').value = settings.categoriesSeoTitle || '';
            document.getElementById('categoriesSeoDescription').value = settings.categoriesSeoDescription || '';
            document.getElementById('categoriesSeoKeywords').value = settings.categoriesSeoKeywords || '';

            // Footer
            document.getElementById('footerDescription').value = settings.footerDescription || '';
            document.getElementById('footerCopyright').value = settings.footerCopyright || '';
            document.getElementById('footerNavLinks').value = settings.footerNavLinks || '';
            document.getElementById('footerExtraLinks').value = settings.footerExtraLinks || '';
            document.getElementById('footerShowSubscribe').checked = settings.footerShowSubscribe !== '0';
            document.getElementById('footerSubscribeTitle').value = settings.footerSubscribeTitle || '';
            document.getElementById('footerSubscribeText').value = settings.footerSubscribeText || '';

            this.initPageContentTabs();
        } catch (err) {
            console.error('Page content load error:', err);
        }
    },

    initPageContentTabs() {
        const tabs = document.querySelectorAll('.page-tab');
        const panels = document.querySelectorAll('.page-content-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.dataset.page;

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                panels.forEach(panel => {
                    panel.classList.remove('active');
                    if (panel.id === `panel-${targetPage}`) {
                        panel.classList.add('active');
                    }
                });
            });
        });

        const form = document.getElementById('pageContentForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePageContent();
            });
        }
    },

    async savePageContent() {
        const settings = {
            homeHeroTitle: document.getElementById('homeHeroTitle').value,
            homeHeroTitleHighlight: document.getElementById('homeHeroTitleHighlight').value,
            homeHeroSubtitle: document.getElementById('homeHeroSubtitle').value,
            homeSeoTitle: document.getElementById('homeSeoTitle').value,
            homeSeoDescription: document.getElementById('homeSeoDescription').value,
            homeSeoKeywords: document.getElementById('homeSeoKeywords').value,
            aboutTitle: document.getElementById('aboutTitle').value,
            aboutTitleHighlight: document.getElementById('aboutTitleHighlight').value,
            aboutSubtitle: document.getElementById('aboutSubtitle').value,
            aboutContent: document.getElementById('aboutContent').value,
            aboutSeoTitle: document.getElementById('aboutSeoTitle').value,
            aboutSeoDescription: document.getElementById('aboutSeoDescription').value,
            aboutSeoKeywords: document.getElementById('aboutSeoKeywords').value,
            contactTitle: document.getElementById('contactTitle').value,
            contactTitleHighlight: document.getElementById('contactTitleHighlight').value,
            contactSubtitle: document.getElementById('contactSubtitle').value,
            contactEmail: document.getElementById('contactEmail').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactAddress: document.getElementById('contactAddress').value,
            contactResponseTime: document.getElementById('contactResponseTime').value,
            socialTelegram: document.getElementById('socialTelegram').value,
            socialVk: document.getElementById('socialVk').value,
            socialYoutube: document.getElementById('socialYoutube').value,
            socialGithub: document.getElementById('socialGithub').value,
            socialTwitter: document.getElementById('socialTwitter').value,
            socialInstagram: document.getElementById('socialInstagram').value,
            contactSeoTitle: document.getElementById('contactSeoTitle').value,
            contactSeoDescription: document.getElementById('contactSeoDescription').value,
            contactSeoKeywords: document.getElementById('contactSeoKeywords').value,
            categoriesTitle: document.getElementById('categoriesTitle').value,
            categoriesTitleHighlight: document.getElementById('categoriesTitleHighlight').value,
            categoriesSubtitle: document.getElementById('categoriesSubtitle').value,
            categoriesSeoTitle: document.getElementById('categoriesSeoTitle').value,
            categoriesSeoDescription: document.getElementById('categoriesSeoDescription').value,
            categoriesSeoKeywords: document.getElementById('categoriesSeoKeywords').value,
            // Footer
            footerDescription: document.getElementById('footerDescription').value,
            footerCopyright: document.getElementById('footerCopyright').value,
            footerNavLinks: document.getElementById('footerNavLinks').value,
            footerExtraLinks: document.getElementById('footerExtraLinks').value,
            footerShowSubscribe: document.getElementById('footerShowSubscribe').checked ? '1' : '0',
            footerSubscribeTitle: document.getElementById('footerSubscribeTitle').value,
            footerSubscribeText: document.getElementById('footerSubscribeText').value
        };

        try {
            await API.saveSettings(settings);
            UI.showToast('Контент страниц сохранён!');
        } catch (err) {
            UI.showToast('Ошибка сохранения', 'error');
        }
    },

    // ============================================
    // IMAGE UPLOAD
    // ============================================

    initImageUpload() {
        const articleDropZone = document.getElementById('articleImageDropZone');
        const articleFileInput = document.getElementById('articleImageFile');
        const articleUrlInput = document.getElementById('articleImage');

        if (articleDropZone && articleFileInput) {
            articleDropZone.addEventListener('click', () => {
                articleFileInput.click();
            });

            articleDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                articleDropZone.classList.add('dragover');
            });

            articleDropZone.addEventListener('dragleave', () => {
                articleDropZone.classList.remove('dragover');
            });

            articleDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                articleDropZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleArticleImageFile(file);
                }
            });

            articleFileInput.addEventListener('change', () => {
                const file = articleFileInput.files[0];
                if (file) {
                    this.handleArticleImageFile(file);
                }
            });
        }

        if (articleUrlInput) {
            articleUrlInput.addEventListener('input', () => {
                const url = articleUrlInput.value.trim();
                if (url) {
                    this.setArticleImagePreview(url);
                    this.currentArticleImage = url;
                } else {
                    this.hideArticleImagePreview();
                    this.currentArticleImage = null;
                }
            });
        }
    },

    switchImageMode(target, mode) {
        let wrapper;
        if (target === 'article') {
            wrapper = document.getElementById('articleImage')?.closest('.image-input-wrapper');
        }

        if (!wrapper) return;

        wrapper.querySelectorAll('.image-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        wrapper.querySelectorAll('.image-mode-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${target}-${mode}-panel`);
        });

        if (mode === 'media') {
            this.loadMediaPicker(target);
        }
    },

    async loadMediaPicker(target) {
        const picker = document.getElementById(`${target}MediaPicker`);
        if (!picker) return;

        try {
            const images = await API.getMedia();

            if (images.length === 0) {
                picker.innerHTML = '<div class="media-picker-empty">Нет загруженных изображений.<br>Загрузите в разделе "Медиа"</div>';
                return;
            }

            picker.innerHTML = images.map(img => `
                <div class="media-picker-item" data-url="${img.path}" data-action="select-media" data-target="${target}" data-id="${img.id}">
                    <img src="${img.path}" alt="${img.filename}">
                </div>
            `).join('');

            // Add event delegation for media picker selection (only once)
            if (!picker.dataset.delegated) {
                picker.dataset.delegated = 'true';
                picker.addEventListener('click', (e) => {
                    const item = e.target.closest('[data-action="select-media"]');
                    if (item) {
                        this.selectMediaImage(item.dataset.target, item.dataset.id, item.dataset.url);
                    }
                });
            }
        } catch (err) {
            picker.innerHTML = '<div class="media-picker-empty">Ошибка загрузки</div>';
        }
    },

    selectMediaImage(target, imageId, url) {
        const picker = document.getElementById(`${target}MediaPicker`);
        if (picker) {
            picker.querySelectorAll('.media-picker-item').forEach(item => {
                item.classList.remove('selected');
            });
            const selectedItem = picker.querySelector(`[data-url="${url}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }

        if (target === 'article') {
            this.setArticleImagePreview(url);
            this.currentArticleImage = url;
        }
    },

    async handleArticleImageFile(file) {
        if (file.size > 5 * 1024 * 1024) {
            UI.showToast('Файл слишком большой (макс. 5MB)', 'error');
            return;
        }

        try {
            const result = await API.uploadMedia(file);
            this.setArticleImagePreview(result.path);
            this.currentArticleImage = result.path;
        } catch (err) {
            UI.showToast('Ошибка загрузки', 'error');
        }
    },

    setArticleImagePreview(src) {
        const preview = document.getElementById('articleImagePreview');
        const previewImg = document.getElementById('articleImagePreviewImg');

        if (preview && previewImg) {
            previewImg.src = src;
            preview.style.display = 'block';
        }
    },

    hideArticleImagePreview() {
        const preview = document.getElementById('articleImagePreview');
        if (preview) {
            preview.style.display = 'none';
        }
    },

    removeArticleImage() {
        this.currentArticleImage = null;
        this.hideArticleImagePreview();

        const urlInput = document.getElementById('articleImage');
        if (urlInput) {
            urlInput.value = '';
        }

        const fileInput = document.getElementById('articleImageFile');
        if (fileInput) {
            fileInput.value = '';
        }

        const picker = document.getElementById('articleMediaPicker');
        if (picker) {
            picker.querySelectorAll('.media-picker-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    },

    // ============================================
    // FEED STATS
    // ============================================

    async loadFeedStats() {
        try {
            const stats = await API.getFeedStats();

            document.getElementById('feedTotalPosts').textContent = stats.totalPosts || 0;
            document.getElementById('feedTotalViews').textContent = stats.totalViews || 0;
            document.getElementById('feedTotalLikes').textContent = stats.totalLikes || 0;
            document.getElementById('feedTotalComments').textContent = stats.totalComments || 0;

            // Show weekly stats info
            const weeklyDiv = document.getElementById('weeklyStats');
            if (weeklyDiv && stats.postsPerDay) {
                const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                const today = new Date();

                // Convert array of {date, count} to map for easy lookup
                const countByDate = {};
                stats.postsPerDay.forEach(item => {
                    countByDate[item.date] = item.count;
                });

                let html = '<div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">';
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dayName = days[date.getDay()];
                    // Format date as YYYY-MM-DD to match API response
                    const dateStr = date.toISOString().split('T')[0];
                    const count = countByDate[dateStr] || 0;
                    html += `<div style="text-align: center; padding: 12px 16px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 20px; font-weight: 600;">${count}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${dayName}</div>
                    </div>`;
                }
                html += '</div>';
                weeklyDiv.innerHTML = html;
            }

            // Load top posts
            const posts = await API.getPosts({ limit: 10, sort: 'views' });
            this.loadTopPosts(posts.posts || posts || []);

            // Load tags
            const tags = await API.getTopTags();
            this.loadTagsStats(tags);
        } catch (err) {
            console.error('Feed stats error:', err);
        }
    },

    loadTopPosts(posts) {
        const tableBody = document.getElementById('topPostsTable');
        if (!tableBody) return;

        if (!posts.length) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Нет постов</td></tr>';
            return;
        }

        tableBody.innerHTML = posts.map(post => {
            const content = (post.content || '').replace(/<[^>]*>/g, '').substring(0, 50) + '...';

            return `
                <tr>
                    <td>${post.author_name || 'Аноним'}</td>
                    <td>${content}</td>
                    <td>${post.views || 0}</td>
                    <td>${post.likes || 0}</td>
                    <td>${post.comments || 0}</td>
                    <td>${UI.formatDate(post.created_at)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="table-action-btn" data-action="view-post" data-slug="${post.slug}" title="Просмотр">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                            <button class="table-action-btn delete" data-action="delete-post" data-id="${post.id}" title="Удалить">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event delegation for post actions (only once)
        if (!tableBody.dataset.delegated) {
            tableBody.dataset.delegated = 'true';
            tableBody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;

                const action = btn.dataset.action;

                switch (action) {
                    case 'view-post':
                        window.open('../pages/post.html?slug=' + btn.dataset.slug, '_blank');
                        break;
                    case 'delete-post':
                        this.deleteFeedPost(parseInt(btn.dataset.id, 10));
                        break;
                }
            });
        }
    },

    loadTagsStats(tags) {
        const tagsList = document.getElementById('statsTagsList');
        if (!tagsList) return;

        if (!tags || !tags.length) {
            tagsList.innerHTML = '<p style="color: var(--text-muted);">Нет тегов</p>';
            return;
        }

        tagsList.innerHTML = tags.map(tag => `
            <div class="stats-tag-item">
                <span class="stats-tag-name">#${tag.tag}</span>
                <span class="stats-tag-count">${tag.count}</span>
            </div>
        `).join('');
    },

    async deleteFeedPost(postId) {
        if (!confirm('Удалить этот пост?')) return;

        try {
            await API.deletePost(postId);
            UI.showToast('Пост удалён');
            this.loadFeedStats();
        } catch (err) {
            UI.showToast('Ошибка удаления', 'error');
        }
    },

    // ============================================
    // FEED SETTINGS
    // ============================================

    async loadFeedSettings() {
        try {
            const settings = await API.getSettings();

            const fields = {
                feedPostsPerPage: settings.feedPostsPerPage || 10,
                feedAllowAnonymous: settings.feedAllowAnonymous || false,
                feedAllowImages: settings.feedAllowImages !== false,
                feedAllowFiles: settings.feedAllowFiles !== false,
                feedMaxContentLength: settings.feedMaxContentLength || 2000,
                feedModerateNew: settings.feedModerateNew || false,
                feedModerateComments: settings.feedModerateComments || false,
                feedBannedWords: settings.feedBannedWords || '',
                feedShowTopTags: settings.feedShowTopTags !== false,
                feedShowTopAuthors: settings.feedShowTopAuthors !== false,
                feedSidebarTagsCount: settings.feedSidebarTagsCount || 10,
                feedSidebarAuthorsCount: settings.feedSidebarAuthorsCount || 5
            };

            Object.entries(fields).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = value;
                    } else {
                        el.value = value;
                    }
                }
            });

            const form = document.getElementById('feedSettingsForm');
            if (form && !form.dataset.initialized) {
                form.dataset.initialized = 'true';
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveFeedSettings();
                });
            }
        } catch (err) {
            console.error('Feed settings load error:', err);
        }
    },

    async saveFeedSettings() {
        const settings = {
            feedPostsPerPage: parseInt(document.getElementById('feedPostsPerPage').value) || 10,
            feedAllowAnonymous: document.getElementById('feedAllowAnonymous').checked,
            feedAllowImages: document.getElementById('feedAllowImages').checked,
            feedAllowFiles: document.getElementById('feedAllowFiles').checked,
            feedMaxContentLength: parseInt(document.getElementById('feedMaxContentLength').value) || 2000,
            feedModerateNew: document.getElementById('feedModerateNew').checked,
            feedModerateComments: document.getElementById('feedModerateComments').checked,
            feedBannedWords: document.getElementById('feedBannedWords').value,
            feedShowTopTags: document.getElementById('feedShowTopTags').checked,
            feedShowTopAuthors: document.getElementById('feedShowTopAuthors').checked,
            feedSidebarTagsCount: parseInt(document.getElementById('feedSidebarTagsCount').value) || 10,
            feedSidebarAuthorsCount: parseInt(document.getElementById('feedSidebarAuthorsCount').value) || 5
        };

        try {
            await API.saveSettings(settings);
            UI.showToast('Настройки сохранены');
        } catch (err) {
            UI.showToast('Ошибка сохранения', 'error');
        }
    }
};

// Global functions
function showSection(section) {
    Admin.showSection(section);
}

function previewArticle() {
    const content = document.getElementById('editorContent').innerHTML;
    const title = document.getElementById('articleTitleInput').value;

    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Предпросмотр: ${title}</title>
            <link rel="stylesheet" href="../css/style.css">
            <style>
                body { padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { margin-bottom: 24px; }
            </style>
        </head>
        <body data-theme="${document.documentElement.getAttribute('data-theme')}">
            <h1>${title}</h1>
            <article class="article-body">${content}</article>
        </body>
        </html>
    `);
}

function resetArticleForm() {
    Admin.resetArticleForm();
    Admin.showSection('articles');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Auth to be ready
    let attempts = 0;
    while (!window.Auth && attempts < 40) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
    }

    // Wait for Auth.init to complete
    attempts = 0;
    while (attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
        if (window.Auth.currentUser !== undefined || !localStorage.getItem('gammy_token')) {
            break;
        }
    }

    Admin.init();
});

window.Admin = Admin;
