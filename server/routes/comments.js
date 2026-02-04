/**
 * Comments Routes - Post and article comments
 */

const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// Get comments for post
router.get('/post/:postId', (req, res) => {
    try {
        const db = getDb();
        const comments = db.prepare(`
            SELECT c.*, u.avatar as user_avatar
            FROM post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
        `).all(req.params.postId);

        res.json(comments);
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Add comment to post
router.post('/post/:postId', optionalAuth, (req, res) => {
    try {
        const { author_name, author_email, content } = req.body;
        const db = getDb();

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const name = req.user?.name || author_name;
        const email = req.user?.email || author_email;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(`
            INSERT INTO post_comments (post_id, user_id, author_name, author_email, content)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.params.postId, req.user?.id || null, name, email, content);

        const comment = db.prepare(`
            SELECT c.*, u.avatar as user_avatar
            FROM post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(result.lastInsertRowid);

        // Create notification for post owner
        const post = db.prepare('SELECT author_id, content FROM posts WHERE id = ?').get(req.params.postId);
        if (post && post.author_id && post.author_id !== (req.user?.id || null)) {
            const preview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
            createNotification(db, {
                userId: post.author_id,
                type: 'comment_post',
                sourceUserId: req.user?.id,
                sourceUserName: name,
                postId: parseInt(req.params.postId),
                commentId: result.lastInsertRowid,
                message: `${name} прокомментировал ваш пост: "${preview}"`
            });
        }

        res.json(comment);
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete post comment
router.delete('/post/:commentId', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const comment = db.prepare('SELECT * FROM post_comments WHERE id = ?').get(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Only author or admin can delete
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare('DELETE FROM post_comments WHERE id = ?').run(req.params.commentId);
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Get comments for article
router.get('/article/:articleId', (req, res) => {
    try {
        const db = getDb();
        const comments = db.prepare(`
            SELECT c.*, u.avatar as user_avatar
            FROM article_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.article_id = ?
            ORDER BY c.created_at DESC
        `).all(req.params.articleId);

        res.json(comments);
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Add comment to article
router.post('/article/:articleId', optionalAuth, (req, res) => {
    try {
        const { author_name, author_email, content } = req.body;
        const db = getDb();

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const name = req.user?.name || author_name;
        const email = req.user?.email || author_email;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(`
            INSERT INTO article_comments (article_id, user_id, author_name, author_email, content)
            VALUES (?, ?, ?, ?, ?)
        `).run(req.params.articleId, req.user?.id || null, name, email, content);

        const comment = db.prepare(`
            SELECT c.*, u.avatar as user_avatar
            FROM article_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(result.lastInsertRowid);

        // Create notification for article author
        const article = db.prepare('SELECT author_id, title FROM articles WHERE id = ?').get(req.params.articleId);
        if (article && article.author_id && article.author_id !== (req.user?.id || null)) {
            createNotification(db, {
                userId: article.author_id,
                type: 'comment_article',
                sourceUserId: req.user?.id,
                sourceUserName: name,
                articleId: parseInt(req.params.articleId),
                commentId: result.lastInsertRowid,
                message: `${name} прокомментировал статью "${article.title}"`
            });
        }

        res.json(comment);
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete article comment
router.delete('/article/:commentId', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const comment = db.prepare('SELECT * FROM article_comments WHERE id = ?').get(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare('DELETE FROM article_comments WHERE id = ?').run(req.params.commentId);
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Get all comments (admin)
router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();

        const postComments = db.prepare(`
            SELECT c.*, p.slug as post_slug, 'post' as type
            FROM post_comments c
            JOIN posts p ON c.post_id = p.id
            ORDER BY c.created_at DESC
            LIMIT 50
        `).all();

        const articleComments = db.prepare(`
            SELECT c.*, a.slug as article_slug, 'article' as type
            FROM article_comments c
            JOIN articles a ON c.article_id = a.id
            ORDER BY c.created_at DESC
            LIMIT 50
        `).all();

        res.json([...postComments, ...articleComments].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 50));
    } catch (err) {
        console.error('Get all comments error:', err);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

module.exports = router;
