/**
 * Auth Routes - Login, Register
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const db = getDb();

        // Check if user exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert user
        const result = db.prepare(`
            INSERT INTO users (email, password, name)
            VALUES (?, ?, ?)
        `).run(email, hashedPassword, name);

        const user = db.prepare('SELECT id, email, name, role, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ user, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email or login and password required' });
        }

        const db = getDb();
        // Allow login by email OR username (name)
        const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ?').get(email, email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT id, email, name, role, avatar, bio, notify_comments, notify_newsletter, created_at FROM users WHERE id = ?').get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user stats
        const likesCount = db.prepare(`
            SELECT COUNT(*) as count FROM post_likes
            WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
        `).get(req.user.id);

        const commentsCount = db.prepare(`
            SELECT COUNT(*) as count FROM post_comments WHERE user_id = ?
        `).get(req.user.id);

        const articleCommentsCount = db.prepare(`
            SELECT COUNT(*) as count FROM article_comments WHERE user_id = ?
        `).get(req.user.id);

        user.likes_count = likesCount?.count || 0;
        user.comments_count = (commentsCount?.count || 0) + (articleCommentsCount?.count || 0);

        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update current user
router.put('/me', authMiddleware, (req, res) => {
    try {
        const { name, bio, avatar, notify_comments, notify_newsletter } = req.body;
        const db = getDb();

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (bio !== undefined) {
            updates.push('bio = ?');
            params.push(bio);
        }
        if (avatar !== undefined) {
            updates.push('avatar = ?');
            params.push(avatar);
        }
        if (notify_comments !== undefined) {
            updates.push('notify_comments = ?');
            params.push(notify_comments ? 1 : 0);
        }
        if (notify_newsletter !== undefined) {
            updates.push('notify_newsletter = ?');
            params.push(notify_newsletter ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(req.user.id);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const user = db.prepare('SELECT id, email, name, role, avatar, bio, notify_comments, notify_newsletter, created_at FROM users WHERE id = ?').get(req.user.id);

        // Get user stats
        const likesCount = db.prepare(`
            SELECT COUNT(*) as count FROM post_likes
            WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
        `).get(req.user.id);

        const commentsCount = db.prepare(`
            SELECT COUNT(*) as count FROM post_comments WHERE user_id = ?
        `).get(req.user.id);

        const articleCommentsCount = db.prepare(`
            SELECT COUNT(*) as count FROM article_comments WHERE user_id = ?
        `).get(req.user.id);

        user.likes_count = likesCount?.count || 0;
        user.comments_count = (commentsCount?.count || 0) + (articleCommentsCount?.count || 0);

        res.json(user);
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Change password
router.put('/password', authMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const db = getDb();

        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
