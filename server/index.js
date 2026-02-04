/**
 * Gammy Blog - Server
 * Node.js + Express + SQLite
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');
const articlesRoutes = require('./routes/articles');
const commentsRoutes = require('./routes/comments');
const categoriesRoutes = require('./routes/categories');
const mediaRoutes = require('./routes/media');
const settingsRoutes = require('./routes/settings');
const seoRoutes = require('./routes/seo');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// SSR for article pages (SEO meta tags)
app.get('/pages/article.html', (req, res) => {
    const { id, slug } = req.query;

    if (!id && !slug) {
        return res.sendFile(path.join(__dirname, '..', 'pages', 'article.html'));
    }

    try {
        const database = db.getDb();
        let article;

        if (id) {
            article = database.prepare('SELECT * FROM articles WHERE id = ?').get(id);
        } else if (slug) {
            article = database.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
        }

        if (!article) {
            return res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
        }

        // Read the template
        let html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'article.html'), 'utf8');

        // Prepare SEO data
        const title = article.seo_title || article.title;
        const description = article.seo_description || article.excerpt || '';
        const keywords = article.seo_keywords || '';
        const image = article.image || '';
        const url = `https://gammy.space/pages/article.html?slug=${article.slug || article.id}`;

        // Escape HTML entities for safety
        const escapeHtml = (str) => str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

        // Replace meta tags
        html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} - Gammy</title>`);
        html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${escapeHtml(description)}">`);
        html = html.replace(/<meta name="keywords" content=".*?">/, `<meta name="keywords" content="${escapeHtml(keywords)}">`);
        html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeHtml(title)}">`);
        html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${escapeHtml(description)}">`);
        html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${image}">`);

        // Add og:url if not present
        if (!html.includes('og:url')) {
            html = html.replace('</head>', `    <meta property="og:url" content="${url}">\n</head>`);
        }

        res.send(html);
    } catch (err) {
        console.error('SSR article error:', err);
        res.sendFile(path.join(__dirname, '..', 'pages', 'article.html'));
    }
});

// SSR for post pages (SEO meta tags)
app.get('/pages/post.html', (req, res) => {
    const { id, slug } = req.query;

    if (!id && !slug) {
        return res.sendFile(path.join(__dirname, '..', 'pages', 'post.html'));
    }

    try {
        const database = db.getDb();
        let post;

        if (id) {
            post = database.prepare('SELECT p.*, u.name as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ?').get(id);
        } else if (slug) {
            post = database.prepare('SELECT p.*, u.name as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.slug = ?').get(slug);
        }

        if (!post) {
            return res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
        }

        // Read the template
        let html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'post.html'), 'utf8');

        // Prepare SEO data
        const title = post.content ? post.content.substring(0, 60) + '...' : 'Пост';
        const description = post.content ? post.content.substring(0, 160) : '';
        const author = post.author_name || post.guest_name || 'Аноним';

        // Escape HTML entities
        const escapeHtml = (str) => str ? str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ') : '';

        // Replace meta tags
        html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} - Gammy</title>`);
        html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${escapeHtml(description)}">`);
        html = html.replace(/<meta name="author" content=".*?">/, `<meta name="author" content="${escapeHtml(author)}">`);

        res.send(html);
    } catch (err) {
        console.error('SSR post error:', err);
        res.sendFile(path.join(__dirname, '..', 'pages', 'post.html'));
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);

// SEO routes (robots.txt, sitemap.xml)
app.use('/', seoRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve 404 for non-existent routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        // Check if requesting a specific file (has extension)
        const ext = path.extname(req.path);
        if (ext && ext !== '.html') {
            // File not found (static middleware would have served it)
            return res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
        }

        // For HTML pages, check if file exists
        let filePath;
        if (req.path === '/' || req.path === '/index.html') {
            filePath = path.join(__dirname, '..', 'index.html');
        } else if (req.path.endsWith('.html')) {
            filePath = path.join(__dirname, '..', req.path);
        } else {
            // Try to find corresponding HTML file
            const htmlPath = path.join(__dirname, '..', req.path + '.html');
            const indexPath = path.join(__dirname, '..', req.path, 'index.html');
            if (fs.existsSync(htmlPath)) {
                filePath = htmlPath;
            } else if (fs.existsSync(indexPath)) {
                filePath = indexPath;
            } else {
                // No matching file - show 404
                return res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
            }
        }

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).sendFile(path.join(__dirname, '..', 'pages', '404.html'));
        }
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
db.init();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
