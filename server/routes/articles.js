/**
 * Articles Routes - Blog articles CRUD
 */

const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate slug from title
function generateSlug(title) {
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    return title.toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Get all articles (with filters)
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { category, status, limit, offset } = req.query;

        let query = `
            SELECT a.*, u.name as author_name,
                   (SELECT COUNT(*) FROM article_comments WHERE article_id = a.id) as comments_count
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (category) {
            query += ' AND a.category = ?';
            params.push(category);
        }

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        } else {
            // By default show only published for non-admin requests
            query += ' AND a.status = ?';
            params.push('published');
        }

        query += ' ORDER BY a.created_at DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        if (offset) {
            query += ' OFFSET ?';
            params.push(parseInt(offset));
        }

        const articles = db.prepare(query).all(...params);
        res.json(articles);
    } catch (err) {
        console.error('Get articles error:', err);
        res.status(500).json({ error: 'Failed to get articles' });
    }
});

// Get all articles (admin - includes drafts)
router.get('/admin', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();
        const articles = db.prepare(`
            SELECT a.*, u.name as author_name,
                   (SELECT COUNT(*) FROM article_comments WHERE article_id = a.id) as comments_count
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            ORDER BY a.created_at DESC
        `).all();
        res.json(articles);
    } catch (err) {
        console.error('Get articles error:', err);
        res.status(500).json({ error: 'Failed to get articles' });
    }
});

// Get article by slug
router.get('/slug/:slug', (req, res) => {
    try {
        const db = getDb();
        const article = db.prepare(`
            SELECT a.*, u.name as author_name,
                   (SELECT COUNT(*) FROM article_comments WHERE article_id = a.id) as comments_count
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.slug = ?
        `).get(req.params.slug);

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Increment views
        db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);
        article.views++;

        res.json(article);
    } catch (err) {
        console.error('Get article error:', err);
        res.status(500).json({ error: 'Failed to get article' });
    }
});

// Get article by ID
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const article = db.prepare(`
            SELECT a.*, u.name as author_name
            FROM articles a
            LEFT JOIN users u ON a.author_id = u.id
            WHERE a.id = ?
        `).get(req.params.id);

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        res.json(article);
    } catch (err) {
        console.error('Get article error:', err);
        res.status(500).json({ error: 'Failed to get article' });
    }
});

// Create article (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { title, excerpt, content, image, category, status, seo_title, seo_description, seo_keywords, slug: customSlug } = req.body;
        const db = getDb();

        const slug = customSlug || generateSlug(title);

        const result = db.prepare(`
            INSERT INTO articles (title, slug, excerpt, content, image, category, status, author_id, seo_title, seo_description, seo_keywords)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(title, slug, excerpt, content, image, category, status || 'draft', req.user.id, seo_title, seo_description, seo_keywords);

        const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
        res.json(article);
    } catch (err) {
        console.error('Create article error:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// Update article (admin only)
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { title, excerpt, content, image, category, status, seo_title, seo_description, seo_keywords, slug: customSlug } = req.body;
        const db = getDb();

        const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const slug = customSlug || article.slug || generateSlug(title);

        db.prepare(`
            UPDATE articles SET
                title = ?, slug = ?, excerpt = ?, content = ?, image = ?,
                category = ?, status = ?, seo_title = ?, seo_description = ?,
                seo_keywords = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(title, slug, excerpt, content, image, category, status, seo_title, seo_description, seo_keywords, req.params.id);

        const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (err) {
        console.error('Update article error:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// Delete article (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
        res.json({ message: 'Article deleted' });
    } catch (err) {
        console.error('Delete article error:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// Get articles stats
router.get('/stats/overview', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();

        const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
        const totalViews = db.prepare('SELECT SUM(views) as sum FROM articles').get().sum || 0;
        const totalComments = db.prepare('SELECT COUNT(*) as count FROM article_comments').get().count;
        const published = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'").get().count;

        res.json({ totalArticles, totalViews, totalComments, published });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
