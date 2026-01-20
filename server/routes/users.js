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

// Get user by ID
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const user = db.prepare('SELECT id, name, avatar, bio, created_at FROM users WHERE id = ?').get(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update user role (admin only)
router.put('/:id/role', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { role } = req.body;
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
