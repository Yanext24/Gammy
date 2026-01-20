/**
 * Gammy API Client
 * Handles all API requests to the server
 */

const API = {
    baseUrl: '/api',
    token: localStorage.getItem('gammy_token'),

    // Set auth token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('gammy_token', token);
        } else {
            localStorage.removeItem('gammy_token');
        }
    },

    // Get auth headers
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    // Generic request method
    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // PUT request
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // ============================================
    // AUTH
    // ============================================

    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        this.setToken(data.token);
        return data;
    },

    async register(name, email, password) {
        const data = await this.post('/auth/register', { name, email, password });
        this.setToken(data.token);
        return data;
    },

    async logout() {
        this.setToken(null);
        localStorage.removeItem('gammy_user');
    },

    async getMe() {
        return this.get('/auth/me');
    },

    async updateMe(data) {
        return this.put('/auth/me', data);
    },

    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/password', { currentPassword, newPassword });
    },

    // ============================================
    // USERS
    // ============================================

    async getUsers() {
        return this.get('/users');
    },

    async getUser(id) {
        return this.get(`/users/${id}`);
    },

    async updateUserRole(id, role) {
        return this.put(`/users/${id}/role`, { role });
    },

    async deleteUser(id) {
        return this.delete(`/users/${id}`);
    },

    // ============================================
    // POSTS (Feed)
    // ============================================

    async getPosts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/posts${query ? '?' + query : ''}`);
    },

    async getPost(id) {
        return this.get(`/posts/${id}`);
    },

    async getPostBySlug(slug) {
        return this.get(`/posts/slug/${slug}`);
    },

    async createPost(data) {
        return this.post('/posts', data);
    },

    async updatePost(id, data) {
        return this.put(`/posts/${id}`, data);
    },

    async deletePost(id) {
        return this.delete(`/posts/${id}`);
    },

    async likePost(id) {
        return this.post(`/posts/${id}/like`, {});
    },

    async getTopTags() {
        return this.get('/posts/stats/tags');
    },

    async getTopAuthors() {
        return this.get('/posts/stats/authors');
    },

    async getFeedStats() {
        return this.get('/posts/stats/overview');
    },

    // ============================================
    // COMMENTS
    // ============================================

    async getPostComments(postId) {
        return this.get(`/comments/post/${postId}`);
    },

    async addPostComment(postId, data) {
        return this.post(`/comments/post/${postId}`, data);
    },

    async deletePostComment(commentId) {
        return this.delete(`/comments/post/${commentId}`);
    },

    async getArticleComments(articleId) {
        return this.get(`/comments/article/${articleId}`);
    },

    async addArticleComment(articleId, data) {
        return this.post(`/comments/article/${articleId}`, data);
    },

    async deleteArticleComment(commentId) {
        return this.delete(`/comments/article/${commentId}`);
    },

    async getAllComments() {
        return this.get('/comments/all');
    },

    // ============================================
    // ARTICLES
    // ============================================

    async getArticles(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/articles${query ? '?' + query : ''}`);
    },

    async getArticlesAdmin() {
        return this.get('/articles/admin');
    },

    async getArticle(id) {
        return this.get(`/articles/${id}`);
    },

    async getArticleBySlug(slug) {
        return this.get(`/articles/slug/${slug}`);
    },

    async createArticle(data) {
        return this.post('/articles', data);
    },

    async updateArticle(id, data) {
        return this.put(`/articles/${id}`, data);
    },

    async deleteArticle(id) {
        return this.delete(`/articles/${id}`);
    },

    async getArticlesStats() {
        return this.get('/articles/stats/overview');
    },

    // ============================================
    // CATEGORIES
    // ============================================

    async getCategories() {
        return this.get('/categories');
    },

    async getCategory(slug) {
        return this.get(`/categories/${slug}`);
    },

    async createCategory(data) {
        return this.post('/categories', data);
    },

    async updateCategory(id, data) {
        return this.put(`/categories/${id}`, data);
    },

    async deleteCategory(id) {
        return this.delete(`/categories/${id}`);
    },

    // ============================================
    // MEDIA
    // ============================================

    async getMedia() {
        return this.get('/media');
    },

    async uploadMedia(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(this.baseUrl + '/media/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        return response.json();
    },

    async uploadBase64(data, filename) {
        return this.post('/media/upload-base64', { data, filename });
    },

    async deleteMedia(id) {
        return this.delete(`/media/${id}`);
    },

    // ============================================
    // SETTINGS
    // ============================================

    async getSettings() {
        return this.get('/settings');
    },

    async getSetting(key) {
        return this.get(`/settings/${key}`);
    },

    async saveSetting(key, value) {
        return this.put(`/settings/${key}`, { value });
    },

    async saveSettings(settings) {
        return this.post('/settings/bulk', settings);
    }
};

// Check if user is logged in on page load
(function() {
    const token = localStorage.getItem('gammy_token');
    if (token) {
        API.setToken(token);
    }
})();

window.API = API;
