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
        console.log('[Feed] init() called');
        console.log('[Feed] postsFeed element:', document.getElementById('postsFeed'));
        console.log('[Feed] feedPosts element:', document.getElementById('feedPosts'));
        await this.loadPosts();
        this.loadTopTags();
        this.loadTopAuthors();
        await this.initCreatePost();
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
                <div class="post-card-header">
                    <div class="post-author-avatar" onclick="Feed.showUserProfile(${post.author_id})" style="cursor:pointer;">
                        ${post.author_avatar ? `<img src="${post.author_avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A')}
                    </div>
                    <div class="post-author-info">
                        <span class="post-author-name" onclick="Feed.showUserProfile(${post.author_id})" style="cursor:pointer;">${post.author_name || 'Аноним'}</span>
                        <span class="post-meta">${UI.timeAgo(post.created_at)}</span>
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

                <div class="post-card-content">
                    <div class="post-text">${this.formatContent(post.content)}</div>

                    ${images.length > 0 ? this.renderImageGallery(images, post.id) : ''}

                    ${tags.length > 0 ? `
                        <div class="post-tags">
                            ${tags.map(tag => `<a href="?tag=${encodeURIComponent(tag)}" class="post-tag">#${tag}</a>`).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="post-card-footer">
                    <button class="post-action-btn ${post.user_liked ? 'liked' : ''}" onclick="Feed.toggleLike('${post.id}')">
                        <svg viewBox="0 0 24 24" fill="${post.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>${post.likes_count || 0}</span>
                    </button>
                    <a href="pages/post.html?id=${post.id}" class="post-action-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${post.comments_count || 0}</span>
                    </a>
                    <button class="post-action-btn" onclick="Feed.sharePost('${post.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                    <span class="post-meta" style="margin-left:auto;">${post.views || 0} просмотров</span>
                </div>
            </article>
        `;
    },

    formatContent(content) {
        if (!content) return '';
        return content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
                      .replace(/\n/g, '<br>');
    },

    getImagesClass(count) {
        if (count === 1) return 'single';
        if (count === 2) return 'double';
        if (count === 3) return 'triple';
        if (count === 4) return 'quad';
        return 'many';
    },

    // Render Telegram-style image gallery
    renderImageGallery(images, postId) {
        const count = images.length;
        const galleryClass = this.getImagesClass(count);
        const displayImages = images.slice(0, 4);
        const extraCount = count - 4;

        let html = `<div class="post-images ${galleryClass}" data-post-id="${postId}" data-images='${JSON.stringify(images)}'>`;

        displayImages.forEach((img, index) => {
            const isLast = index === 3 && extraCount > 0;
            if (isLast) {
                html += `
                    <div class="post-image-wrapper has-more" data-more="+${extraCount}" onclick="Feed.openGallery(${postId}, ${index})">
                        <img src="${img}" alt="" class="post-image" loading="lazy">
                    </div>`;
            } else {
                html += `<img src="${img}" alt="" class="post-image" onclick="Feed.openGallery(${postId}, ${index})" loading="lazy">`;
            }
        });

        html += '</div>';
        return html;
    },

    // Open gallery lightbox
    openGallery(postId, startIndex = 0) {
        const gallery = document.querySelector(`.post-images[data-post-id="${postId}"]`);
        if (!gallery) return;

        const images = JSON.parse(gallery.dataset.images || '[]');
        if (images.length === 0) return;

        this.showLightbox(images, startIndex);
    },

    // Show lightbox
    showLightbox(images, currentIndex = 0) {
        // Remove existing lightbox
        const existing = document.getElementById('imageLightbox');
        if (existing) existing.remove();

        const lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'lightbox-overlay';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="Feed.closeLightbox()">&times;</button>
                ${images.length > 1 ? `
                    <button class="lightbox-nav lightbox-prev" onclick="Feed.lightboxPrev()">&#10094;</button>
                    <button class="lightbox-nav lightbox-next" onclick="Feed.lightboxNext()">&#10095;</button>
                ` : ''}
                <img src="${images[currentIndex]}" alt="" class="lightbox-image" id="lightboxImage">
                ${images.length > 1 ? `
                    <div class="lightbox-counter">
                        <span id="lightboxCurrent">${currentIndex + 1}</span> / ${images.length}
                    </div>
                ` : ''}
            </div>
        `;

        // Store state
        lightbox.dataset.images = JSON.stringify(images);
        lightbox.dataset.current = currentIndex;

        // Close on background click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) this.closeLightbox();
        });

        // Keyboard navigation
        document.addEventListener('keydown', this.lightboxKeyHandler);

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        // Animate in
        requestAnimationFrame(() => lightbox.classList.add('active'));
    },

    lightboxKeyHandler(e) {
        if (e.key === 'Escape') Feed.closeLightbox();
        if (e.key === 'ArrowLeft') Feed.lightboxPrev();
        if (e.key === 'ArrowRight') Feed.lightboxNext();
    },

    closeLightbox() {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            setTimeout(() => lightbox.remove(), 300);
            document.body.style.overflow = '';
            document.removeEventListener('keydown', this.lightboxKeyHandler);
        }
    },

    lightboxPrev() {
        const lightbox = document.getElementById('imageLightbox');
        if (!lightbox) return;

        const images = JSON.parse(lightbox.dataset.images || '[]');
        let current = parseInt(lightbox.dataset.current);
        current = (current - 1 + images.length) % images.length;

        lightbox.dataset.current = current;
        document.getElementById('lightboxImage').src = images[current];
        const counter = document.getElementById('lightboxCurrent');
        if (counter) counter.textContent = current + 1;
    },

    lightboxNext() {
        const lightbox = document.getElementById('imageLightbox');
        if (!lightbox) return;

        const images = JSON.parse(lightbox.dataset.images || '[]');
        let current = parseInt(lightbox.dataset.current);
        current = (current + 1) % images.length;

        lightbox.dataset.current = current;
        document.getElementById('lightboxImage').src = images[current];
        const counter = document.getElementById('lightboxCurrent');
        if (counter) counter.textContent = current + 1;
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
    async initCreatePost() {
        const form = document.getElementById('createPostForm');
        const textarea = document.getElementById('postContent');
        const imageBtn = document.getElementById('addImageBtn');
        const imageInput = document.getElementById('postImageInput');

        this.pendingImages = [];

        // Load settings to check if anonymous posting is allowed
        let allowAnonymous = false;
        try {
            const settings = await API.getSettings();
            allowAnonymous = settings.feedAllowAnonymous === true || settings.feedAllowAnonymous === 'true';
        } catch (e) {
            console.error('[Feed] Failed to load settings:', e);
        }

        // Show/hide form based on auth or anonymous setting
        const createPostCard = document.querySelector('.create-post-card');
        if (createPostCard) {
            const canPost = Auth.isLoggedIn() || allowAnonymous;

            if (canPost) {
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
                    if (user.avatar) {
                        avatarEl.innerHTML = `<img src="${user.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                    } else {
                        avatarEl.textContent = user.name.charAt(0).toUpperCase();
                    }
                } else if (avatarEl) {
                    avatarEl.textContent = 'G'; // Guest
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
                    likeBtn.classList.add('liked');
                    svg?.setAttribute('fill', 'currentColor');
                } else {
                    likeBtn.classList.remove('liked');
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
                <a href="?tag=${encodeURIComponent(t.tag)}" class="tag-item">
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
                <div class="author-item" onclick="Feed.showUserProfile(${a.id})" style="cursor: pointer;">
                    <div class="author-item-avatar">
                        ${a.avatar ? `<img src="${a.avatar}" alt="">` : a.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="author-item-info">
                        <span class="author-item-name">${a.name}</span>
                        <span class="author-item-posts">${a.posts_count} постов</span>
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
    },

    // Show user profile modal
    async showUserProfile(userId) {
        try {
            const user = await API.getUser(userId);
            const postsData = await API.getUserPosts(userId, { limit: 5 });

            // Remove existing modal
            const existing = document.getElementById('userProfileModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.id = 'userProfileModal';
            modal.innerHTML = `
                <div class="modal glass" style="max-width: 500px;">
                    <button class="modal-close" onclick="Feed.closeUserProfile()">&times;</button>

                    <div class="user-profile-header" style="text-align: center; margin-bottom: 24px;">
                        <div class="user-profile-avatar" style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; color: white; margin: 0 auto 16px;">
                            ${user.avatar ? `<img src="${user.avatar}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : user.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 style="margin: 0 0 8px; font-size: 24px;">${user.name}</h2>
                        ${user.bio ? `<p style="color: var(--text-muted); margin: 0 0 16px;">${user.bio}</p>` : ''}
                        <div style="display: flex; justify-content: center; gap: 24px; color: var(--text-secondary);">
                            <div><strong>${user.posts_count || 0}</strong> постов</div>
                            <div><strong>${user.likes_received || 0}</strong> лайков</div>
                        </div>
                    </div>

                    ${postsData.posts.length > 0 ? `
                        <div class="user-profile-posts">
                            <h3 style="margin-bottom: 16px; font-size: 16px;">Последние посты</h3>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${postsData.posts.map(post => `
                                    <a href="/pages/post.html?slug=${post.slug}" class="user-profile-post" style="display: block; padding: 12px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; text-decoration: none; color: inherit;">
                                        <p style="margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${post.content}</p>
                                        <div style="font-size: 12px; color: var(--text-muted);">
                                            ${UI.timeAgo(post.created_at)} • ${post.likes_count || 0} лайков • ${post.comments_count || 0} комментариев
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                            ${postsData.pagination.pages > 1 ? `
                                <a href="?author=${userId}" style="display: block; text-align: center; margin-top: 16px; color: var(--accent-primary);">Все посты автора</a>
                            ` : ''}
                        </div>
                    ` : '<p style="text-align: center; color: var(--text-muted);">Пока нет постов</p>'}
                </div>
            `;

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeUserProfile();
            });

            document.body.appendChild(modal);
        } catch (err) {
            console.error('Show user profile error:', err);
            UI.showToast('Ошибка загрузки профиля', 'error');
        }
    },

    closeUserProfile() {
        const modal = document.getElementById('userProfileModal');
        if (modal) modal.remove();
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
            <div class="post-full-header">
                <div class="post-full-avatar">
                    ${this.post.author_name ? this.post.author_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div class="post-author-info">
                    <span class="post-author-name">${this.post.author_name || 'Аноним'}</span>
                    <span class="post-meta">${UI.formatDate(this.post.created_at)} • ${this.post.views || 0} просмотров</span>
                </div>
            </div>

            <div class="post-full-content">
                <div class="post-text">${Feed.formatContent(this.post.content)}</div>

                ${images.length > 0 ? `
                    <div class="post-images ${Feed.getImagesClass(images.length)}">
                        ${images.map(img => `<img src="${img}" alt="" class="post-image" onclick="Feed.openImage('${img}')">`).join('')}
                    </div>
                ` : ''}

                ${tags.length > 0 ? `
                    <div class="post-tags">
                        ${tags.map(tag => `<a href="../index.html?tag=${encodeURIComponent(tag)}" class="post-tag">#${tag}</a>`).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="post-full-actions">
                <button class="post-action-btn ${this.post.user_liked ? 'liked' : ''}" onclick="PostPage.toggleLike()">
                    <svg viewBox="0 0 24 24" fill="${this.post.user_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span id="postLikesCount">${this.post.likes_count || 0}</span>
                </button>
                <button class="post-action-btn" onclick="Feed.sharePost('${this.post.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            const btn = document.querySelector('.post-full-actions .post-action-btn');
            const svg = btn?.querySelector('svg');
            const span = document.getElementById('postLikesCount');

            if (result.liked) {
                btn?.classList.add('liked');
                svg?.setAttribute('fill', 'currentColor');
            } else {
                btn?.classList.remove('liked');
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

// PostPage initialization removed - post.html has its own complete script

// Export immediately for app.js
window.Feed = Feed;
window.PostPage = PostPage;
console.log('[Feed] Feed object exported to window');
