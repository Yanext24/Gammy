/**
 * Notifications Routes - User notifications
 */

const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for current user
router.get('/', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const notifications = db.prepare(`
            SELECT n.*, u.avatar as source_avatar
            FROM notifications n
            LEFT JOIN users u ON n.source_user_id = u.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        `).all(req.user.id);

        res.json(notifications);
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Get unread count
router.get('/unread', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const result = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(req.user.id);

        res.json({ count: result.count });
    } catch (err) {
        console.error('Get unread count error:', err);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, (req, res) => {
    try {
        const db = getDb();

        // Check ownership
        const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error('Mark as read error:', err);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// Mark all as read
router.put('/read-all', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
        res.json({ message: 'All marked as read' });
    } catch (err) {
        console.error('Mark all as read error:', err);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// Delete notification
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const db = getDb();

        const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Helper function to create notification (exported for use in other routes)
function createNotification(db, { userId, type, sourceUserId, sourceUserName, postId, articleId, commentId, message }) {
    if (!userId) return; // Don't create notification if no target user

    // Don't notify yourself
    if (sourceUserId && sourceUserId === userId) return;

    try {
        db.prepare(`
            INSERT INTO notifications (user_id, type, source_user_id, source_user_name, post_id, article_id, comment_id, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, type, sourceUserId || null, sourceUserName, postId || null, articleId || null, commentId || null, message);
    } catch (err) {
        console.error('Create notification error:', err);
    }
}

module.exports = router;
module.exports.createNotification = createNotification;
