/**
 * Categories Routes
 */

const express = require('express');
const { getDb } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const categories = db.prepare(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM articles WHERE category = c.slug) as articles_count
            FROM categories c
            ORDER BY c.name
        `).all();
        res.json(categories);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get category by slug
router.get('/:slug', (req, res) => {
    try {
        const db = getDb();
        const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(category);
    } catch (err) {
        console.error('Get category error:', err);
        res.status(500).json({ error: 'Failed to get category' });
    }
});

// Create category (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { name, slug, color, icon, show_on_home, show_in_footer } = req.body;
        const db = getDb();

        // Валидация полей
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!slug || !slug.trim()) {
            return res.status(400).json({ error: 'Slug is required' });
        }

        // Проверка уникальности slug
        const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
        if (existing) {
            return res.status(400).json({ error: 'Category with this slug already exists' });
        }

        const result = db.prepare(`
            INSERT INTO categories (name, slug, color, icon, show_on_home, show_in_footer)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name.trim(), slug.trim(), color || '#6366f1', icon, show_on_home ? 1 : 0, show_in_footer !== false && show_in_footer !== 0 ? 1 : 0);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.json(category);
    } catch (err) {
        console.error('Create category error:', err);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update category (admin only)
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { name, slug, color, icon, show_on_home, show_in_footer } = req.body;
        const db = getDb();

        db.prepare(`
            UPDATE categories SET name = ?, slug = ?, color = ?, icon = ?, show_on_home = ?, show_in_footer = ?
            WHERE id = ?
        `).run(name, slug, color, icon, show_on_home ? 1 : 0, show_in_footer ? 1 : 0, req.params.id);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
        res.json(category);
    } catch (err) {
        console.error('Update category error:', err);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;
