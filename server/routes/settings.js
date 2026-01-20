/**
 * Settings Routes
 */

const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM settings').all();

        const settings = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });

        res.json(settings);
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Get setting by key
router.get('/:key', (req, res) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);

        if (!row) {
            return res.json(null);
        }

        try {
            res.json(JSON.parse(row.value));
        } catch {
            res.json(row.value);
        }
    } catch (err) {
        console.error('Get setting error:', err);
        res.status(500).json({ error: 'Failed to get setting' });
    }
});

// Save setting (admin only)
router.put('/:key', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { value } = req.body;
        const db = getDb();

        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

        db.prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (?, ?)
        `).run(req.params.key, valueStr);

        res.json({ key: req.params.key, value });
    } catch (err) {
        console.error('Save setting error:', err);
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

// Save multiple settings (admin only)
router.post('/bulk', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const settings = req.body;
        const db = getDb();

        const insert = db.prepare(`
            INSERT OR REPLACE INTO settings (key, value)
            VALUES (?, ?)
        `);

        const saveMany = db.transaction((items) => {
            for (const [key, value] of Object.entries(items)) {
                const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                insert.run(key, valueStr);
            }
        });

        saveMany(settings);

        res.json({ message: 'Settings saved', settings });
    } catch (err) {
        console.error('Save settings error:', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
