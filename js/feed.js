/**
 * Gammy Feed - Social posts functionality
 * Works with server API
 */

const Feed = {
    posts: [],
    currentPage: 1,
    hasMore: true,
    pendingImages: [],

    async init() {
        await this.loadPosts();
        this.loadTopTags();
        this.loadTopAuthors();
        this.initCreatePost();
        this.initSearch();
    },

    // Load posts from API
    async loadPosts(append = false) {
        const container = document.getElementById('postsFeed') || document.getElementById('feedPosts');
        if (!container) return;

        if (!append) {
            container.innerHTML = '<div class="loading" style="text-align:center;padding:40px;color:var(--text-muted);">Загрузка...</div>';
        }

        try {
            const params = new URLSearchParams(window.location.search);
            const tag = params.get('tag');
            const search = params.get('search');

            const data = await API.getPosts({
                page: this.currentPage,
                limit: 10,
                tag: tag || undefined,
                search: search || undefined
            });

            this.posts = append ? [...this.posts, ...data.posts] : data.posts;
            this.hasMore = this.currentPage < data.pagination.pages;

            if (!append) {
                container.innerHTML = '';
            }

            if (this.posts.length === 0) {
                container.innerHTML = '<p class="no-results" style="text-align:center;padding:40px;color:var(--text-muted);">Пока нет постов. Будьте первым!</p>';
                return;
            }

            const newPosts = append ? data.posts : this.posts;
            newPosts.forEach(post => {
                container.insertAdjacentHTML('beforeend', this.renderPost(post));
            });

            // Load more button
            this.updateLoadMoreButton();

        } catch (err) {
            console.error('Load posts error:', err);
            container.innerHTML = '<p class="no-results" style="text-align:center;padding:40px;color:var(--text-muted);">Ошибка загрузки постов</p>';
        }
    },

    renderPost(post) {
        const user = Auth.getCurrentUser();
        const isAuthor = user && post.author_id === user.id;
        const isAdmin = user && user.role === 'admin';
        const canEdit = isAuthor || isAdmin;

        const images = post.images || [];
        const tags = post.tags || [];

        return `
            <article class="post-card glass" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="post-avatar">
                            ${post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div class="post-author-info">
                            <span class="post-author-name">${post.author_name || 'Аноним'}</span>
                            <span class="post-date">${UI.timeAgo(post.created_at)}</span>
                        </div>
                    </div>
                    ${canEdit ? `
                        <div class="post-menu">
                            <button class="post-menu-btn" onclick="Feed.togglePostMenu(${post.id})">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <circle cx="12" cy="5" r="2"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                    <circle cx="12" cy="19" r="2"></circle>
                                </svg>
                            </button>
                            <div class="post-menu-dropdown" id="postMenu-${post.id}">
                                <button onclick="Feed.deletePost('${post.id}')">Удалить</button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="post-content">
                    <p>${this.formatContent(post.content)}</p>
                </div>

                ${images.length > 0 ? `
                    <div class="post-images ${images.length > 1 ? 'post-images-grid' : ''}">
                        ${images.map(img => `<img src="${img}" alt="" class="post-image" onclick="Feed.openImage('${img}')">`).join('')}
                    </div>
                ` : ''}

                ${tags.length > 0 ? `
                    <div class="post-tags">
                        ${tags.map(tag => `<a href="?tag=${encodeURIComponent(tag)}" class="post-tag">#${tag}</a>`).join('')}
                    </div>
                ` : ''}

                <div class="post-stats">
                    <span>${post.views || 0} просмотров</span>
                    <span>${post.comments_count || 0} комментариев</span>
                </div>

                <div class="post-actions">
                    <button class="post-action-btn ${post.user_liked ? 'active' : ''}" onclick="Feed.toggleLike('${post.id}')">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="${post.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <span>${post.likes_count || 0}</span>
                    </button>
                    <a href="pages/post.html?slug=${post.slug}" class="post-action-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${post.comments_count || 0}</span>
                    </a>
                    <button class="post-action-btn" onclick="Feed.sharePost('${post.slug}')">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                </div>
            </article>
        `;
    },

    formatContent(content) {
        if (!content) return '';
        return content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
                      .replace(/\n/g, '<br>');
    },

    updateLoadMoreButton() {
        let loadMoreBtn = document.getElementById('loadMoreBtn') || document.getElementById('loadMorePostsBtn');

        if (this.hasMore) {
            if (!loadMoreBtn) {
                const container = document.getElementById('postsFeed') || document.getElementById('feedPosts');
                if (container) {
                    container.insertAdjacentHTML('afterend', `
                        <button id="loadMoreBtn" class="btn btn-ghost" style="width:100%;margin-top:20px;" onclick="Feed.loadMore()">
                            Загрузить ещё
                        </button>
                    `);
                }
            }
        } else if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
    },

    async loadMore() {
        this.currentPage++;
        await this.loadPosts(true);
    },

    // Create post form
    initCreatePost() {
        const form = document.getElementById('createPostForm');
        const textarea = document.getElementById('postContent');
        const imageBtn = document.getElementById('addImageBtn');
        const imageInput = document.getElementById('postImageInput');

        this.pendingImages = [];

        // Show/hide form based on auth
        const createPostCard = document.querySelector('.create-post-card');
        if (createPostCard) {
            if (Auth.isLoggedIn()) {
                createPostCard.style.display = 'block';

                // Initialize trigger button if exists
                const trigger = document.getElementById('createPostTrigger');
                const formEl = document.getElementById('createPostForm');
                const cancelBtn = document.getElementById('cancelPostBtn');
                const submitBtn = document.getElementById('submitPostBtn');

                if (trigger && formEl) {
                    trigger.addEventListener('click', () => {
                        formEl.classList.remove('hidden');
                        trigger.parentElement.style.display = 'none';
                    });
                }

                if (cancelBtn && formEl) {
                    cancelBtn.addEventListener('click', () => {
                        formEl.classList.add('hidden');
                        if (trigger) trigger.parentElement.style.display = 'flex';
                        textarea.value = '';
                        this.pendingImages = [];
                        const preview = document.getElementById('attachmentsPreview');
                        if (preview) preview.innerHTML = '';
                    });
                }

                if (submitBtn) {
                    submitBtn.addEventListener('click', async () => {
                        await this.submitPost();
                    });
                }

                // Update avatar
                const user = Auth.getCurrentUser();
                const avatarEl = document.getElementById('createPostAvatar');
                if (avatarEl && user) {
                    avatarEl.textContent = user.name.charAt(0).toUpperCase();
                }
            } else {
                createPostCard.innerHTML = `
                    <div style="text-align:center;padding:20px;">
                        <p style="margin-bottom:12px;color:var(--text-secondary);">Войдите, чтобы создавать посты</p>
                        <button class="btn btn-primary" onclick="Modals.showLoginModal()">Войти</button>
                    </div>
                `;
            }
        }

        // Image upload
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e.target.files));
        }
        if (imageBtn) {
            imageBtn.addEventListener('click', () => imageInput && imageInput.click());
        }

        // Form submit (for old structure)
        if (form && form.tagName === 'FORM') {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitPost();
            });
        }

        // Drag & drop
        if (textarea) {
            textarea.addEventListener('dragover', (e) => {
                e.preventDefault();
                textarea.classList.add('dragover');
            });
            textarea.addEventListener('dragleave', () => {
                textarea.classList.remove('dragover');
            });
            textarea.addEventListener('drop', (e) => {
                e.preventDefault();
                textarea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleImageUpload(e.dataTransfer.files);
                }
            });
        }
    },

    handleImageUpload(files) {
        const preview = document.getElementById('postImagesPreview') || document.getElementById('attachmentsPreview');
        if (!preview) return;
        preview.classList.remove('hidden');

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.pendingImages.push(e.target.result);

                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'preview-image-wrapper';
                imgWrapper.innerHTML = `
                    <img src="${e.target.result}" alt="">
                    <button type="button" class="remove-image-btn" onclick="Feed.removeImage(${this.pendingImages.length - 1})">&times;</button>
                `;
                preview.appendChild(imgWrapper);
            };
            reader.readAsDataURL(file);
        });
    },

    removeImage(index) {
        this.pendingImages.splice(index, 1);
        const preview = document.getElementById('postImagesPreview') || document.getElementById('attachmentsPreview');
        if (preview) {
            preview.innerHTML = '';
            this.pendingImages.forEach((img, i) => {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'preview-image-wrapper';
                imgWrapper.innerHTML = `
                    <img src="${img}" alt="">
                    <button type="button" class="remove-image-btn" onclick="Feed.removeImage(${i})">&times;</button>
                `;
                preview.appendChild(imgWrapper);
            });
        }
    },

    async submitPost() {
        const content = document.getElementById('postContent')?.value?.trim();
        const tagsInput = document.getElementById('postTagsInput')?.value?.trim();

        if (!content) {
            UI.showToast('Напишите что-нибудь', 'error');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t) : [];

        // Upload images first
        const images = [];
        for (const base64 of this.pendingImages) {
            try {
                const media = await API.uploadBase64(base64, 'post-image.jpg');
                images.push(media.path);
            } catch (err) {
                console.error('Image upload error:', err);
            }
        }

        try {
            await API.createPost({ content, images, tags });

            document.getElementById('postContent').value = '';
            if (document.getElementById('postTagsInput')) document.getElementById('postTagsInput').value = '';
            const imgPreview = document.getElementById('postImagesPreview') || document.getElementById('attachmentsPreview');
            if (imgPreview) {
                imgPreview.innerHTML = '';
                imgPreview.classList.add('hidden');
            }
            this.pendingImages = [];

            // Reset form visibility
            const formEl = document.getElementById('createPostForm');
            const trigger = document.getElementById('createPostTrigger');
            if (formEl && trigger) {
                formEl.classList.add('hidden');
                trigger.parentElement.style.display = 'flex';
            }

            this.currentPage = 1;
            await this.loadPosts();

            UI.showToast('Пост опубликован!');
        } catch (err) {
            UI.showToast(err.message || 'Ошибка публикации', 'error');
        }
    },

    async toggleLike(postId) {
        try {
            const result = await API.likePost(postId);

            const postEl = document.querySelector(`[data-post-id="${postId}"]`);
            if (postEl) {
                const likeBtn = postEl.querySelector('.post-action-btn');
                const likesSpan = likeBtn?.querySelector('span');
                const svg = likeBtn?.querySelector('svg');

                if (result.liked) {
                    likeBtn.classList.add('active');
                    svg?.setAttribute('fill', 'currentColor');
                } else {
                    likeBtn.classList.remove('active');
                    svg?.setAttribute('fill', 'none');
                }

                if (likesSpan) likesSpan.textContent = result.likes_count;
            }
        } catch (err) {
            UI.showToast('Ошибка', 'error');
        }
    },

    async deletePost(postId) {
        if (!confirm('Удалить этот пост?')) return;

        try {
            await API.deletePost(postId);
            const postEl = document.querySelector(`[data-post-id="${postId}"]`);
            if (postEl) postEl.remove();
            UI.showToast('Пост удалён');
        } catch (err) {
            UI.showToast(err.message || 'Ошибка', 'error');
        }
    },

    sharePost(slug) {
        const url = window.location.origin + '/pages/post.html?slug=' + slug;

        if (navigator.share) {
            navigator.share({ url });
        } else {
            navigator.clipboard.writeText(url);
            UI.showToast('Ссылка скопирована');
        }
    },

    togglePostMenu(postId) {
        const menu = document.getElementById(`postMenu-${postId}`);
        if (menu) menu.classList.toggle('show');
    },

    openImage(src) {
        const overlay = document.createElement('div');
        overlay.className = 'image-lightbox';
        overlay.innerHTML = `
            <img src="${src}" alt="">
            <button class="lightbox-close">&times;</button>
        `;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    },

    async loadTopTags() {
        const container = document.getElementById('topTags');
        if (!container) return;

        try {
            const tags = await API.getTopTags();

            if (tags.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Теги появятся после публикации постов</p>';
                return;
            }

            container.innerHTML = tags.map(t => `
                <a href="?tag=${encodeURIComponent(t.tag)}" class="tag-cloud-item">
                    #${t.tag} <span class="tag-count">${t.count}</span>
                </a>
            `).join('');
        } catch (err) {
            console.error('Load tags error:', err);
        }
    },

    async loadTopAuthors() {
        const container = document.getElementById('topAuthors');
        if (!container) return;

        try {
            const authors = await API.getTopAuthors();

            if (authors.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Пока нет авторов</p>';
                return;
            }

            container.innerHTML = authors.map(a => `
                <div class="author-item">
                    <div class="author-avatar">
                        ${a.avatar ? `<img src="${a.avatar}" alt="">` : a.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="author-info">
                        <span class="author-name">${a.name}</span>
                        <span class="author-posts">${a.posts_count} постов</span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Load authors error:', err);
        }
    },

    initSearch() {
        const input = document.getElementById('feedSearchInput');
        if (!input) return;

        let timeout;
        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const url = new URL(window.location);
                if (e.target.value) {
                    url.searchParams.set('search', e.target.value);
                } else {
                    url.searchParams.delete('search');
                }
                window.history.replaceState({}, '', url);
                this.currentPage = 1;
                this.loadPosts();
            }, 500);
        });
    }
};

// Post page
const PostPage = {
    post: null,

    async init() {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');

        if (!slug) return;

        try {
            this.post = await API.getPostBySlug(slug);
            this.render();
            await this.loadComments();
            this.initCommentForm();
        } catch (err) {
            console.error('Load post error:', err);
            const container = document.querySelector('.post-page');
            if (container) container.innerHTML = '<div class="container"><p>Пост не найден</p></div>';
        }
    },

    render() {
        const container = document.querySelector('.post-full');
        if (!container || !this.post) return;

        document.title = this.post.content.substring(0, 50) + '... - Gammy';

        const images = this.post.images || [];
        const tags = this.post.tags || [];

        container.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <div class="post-avatar" style="width:50px;height:50px;font-size:20px;">
                        ${this.post.author_name ? this.post.author_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div class="post-author-info">
                        <span class="post-author-name" style="font-size:18px;">${this.post.author_name || 'Аноним'}</span>
                        <span class="post-date">${UI.formatDate(this.post.created_at)}</span>
                    </div>
                </div>
            </div>

            <div class="post-content" style="font-size:18px;line-height:1.7;">
                <p>${Feed.formatContent(this.post.content)}</p>
            </div>

            ${images.length > 0 ? `
                <div class="post-images ${images.length > 1 ? 'post-images-grid' : ''}">
                    ${images.map(img => `<img src="${img}" alt="" class="post-image" onclick="Feed.openImage('${img}')">`).join('')}
                </div>
            ` : ''}

            ${tags.length > 0 ? `
                <div class="post-tags" style="margin-top:20px;">
                    ${tags.map(tag => `<a href="../index.html?tag=${encodeURIComponent(tag)}" class="post-tag">#${tag}</a>`).join('')}
                </div>
            ` : ''}

            <div class="post-stats" style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color);">
                <span>${this.post.views} просмотров</span>
            </div>

            <div class="post-actions" style="margin-top:16px;">
                <button class="post-action-btn ${this.post.user_liked ? 'active' : ''}" onclick="PostPage.toggleLike()">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="${this.post.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    <span id="postLikesCount">${this.post.likes_count || 0}</span>
                </button>
                <button class="post-action-btn" onclick="Feed.sharePost('${this.post.slug}')">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
            </div>
        `;
    },

    async toggleLike() {
        if (!this.post) return;

        try {
            const result = await API.likePost(this.post.id);
            const btn = document.querySelector('.post-actions .post-action-btn');
            const svg = btn?.querySelector('svg');
            const span = document.getElementById('postLikesCount');

            if (result.liked) {
                btn?.classList.add('active');
                svg?.setAttribute('fill', 'currentColor');
            } else {
                btn?.classList.remove('active');
                svg?.setAttribute('fill', 'none');
            }

            if (span) span.textContent = result.likes_count;
            this.post.user_liked = result.liked;
            this.post.likes_count = result.likes_count;
        } catch (err) {
            UI.showToast('Ошибка', 'error');
        }
    },

    async loadComments() {
        if (!this.post) return;

        const container = document.getElementById('postComments');
        const countEl = document.getElementById('postCommentsCount');
        if (!container) return;

        try {
            const comments = await API.getPostComments(this.post.id);

            if (countEl) countEl.textContent = comments.length;

            if (comments.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Пока нет комментариев</p>';
                return;
            }

            container.innerHTML = comments.map(c => `
                <div class="post-comment">
                    <div class="post-comment-avatar">
                        ${c.user_avatar ? `<img src="${c.user_avatar}" alt="">` : c.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="post-comment-body">
                        <div class="post-comment-header">
                            <span class="post-comment-author">${c.author_name}</span>
                            <span class="post-comment-date">${UI.timeAgo(c.created_at)}</span>
                        </div>
                        <p class="post-comment-text">${c.content}</p>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Load comments error:', err);
        }
    },

    initCommentForm() {
        const form = document.getElementById('postCommentForm');
        if (!form || !this.post) return;

        const guestFields = form.querySelector('.guest-fields');
        if (guestFields && Auth.isLoggedIn()) {
            guestFields.classList.add('hidden');
            guestFields.querySelectorAll('input').forEach(i => i.removeAttribute('required'));
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const content = document.getElementById('postCommentText')?.value;
            const name = document.getElementById('postCommentName')?.value;
            const email = document.getElementById('postCommentEmail')?.value;

            if (!content) return;

            try {
                await API.addPostComment(this.post.id, {
                    content,
                    author_name: name,
                    author_email: email
                });

                document.getElementById('postCommentText').value = '';
                await this.loadComments();
                UI.showToast('Комментарий добавлен');
            } catch (err) {
                UI.showToast(err.message || 'Ошибка', 'error');
            }
        });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    if (path.includes('post.html')) {
        await PostPage.init();
    } else if (path === '/' || path.endsWith('index.html') || path.includes('feed')) {
        if (document.getElementById('postsFeed') || document.getElementById('feedPosts')) {
            await Feed.init();
        }
    }
});

window.Feed = Feed;
window.PostPage = PostPage;
