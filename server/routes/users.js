/**
 * Users Routes - Admin user management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();
        const users = db.prepare('SELECT id, email, name, role, avatar, created_at FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Get user by ID (public profile)
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT id, name, avatar, bio, created_at FROM users WHERE id = ?').get(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(req.params.id);
        const likesCount = db.prepare(`
            SELECT COUNT(*) as count FROM post_likes
            WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
        `).get(req.params.id);

        user.posts_count = postsCount?.count || 0;
        user.likes_received = likesCount?.count || 0;

        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Get user's posts
router.get('/:id/posts', (req, res) => {
    try {
        const db = getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = db.prepare(`
            SELECT p.*,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            WHERE p.author_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `).all(req.params.id, limit, offset);

        const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(req.params.id);

        // Parse JSON fields
        posts.forEach(post => {
            post.images = JSON.parse(post.images || '[]');
            post.tags = JSON.parse(post.tags || '[]');
        });

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                pages: Math.ceil((total?.count || 0) / limit)
            }
        });
    } catch (err) {
        console.error('Get user posts error:', err);
        res.status(500).json({ error: 'Failed to get user posts' });
    }
});

// Update user role (admin only)
router.put('/:id/role', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { role } = req.body;

        // Validate role
        const allowedRoles = ['user', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Allowed: user, admin' });
        }

        const db = getDb();

        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

        const user = db.prepare('SELECT id, email, name, role, avatar, created_at FROM users WHERE id = ?').get(req.params.id);
        res.json(user);
    } catch (err) {
        console.error('Update role error:', err);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();

        // Don't allow deleting yourself
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
