/**
 * SEO Routes - robots.txt & sitemap.xml
 */

const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// Default robots.txt content
const DEFAULT_ROBOTS = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://gammy.space/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin and API
Disallow: /api/
Disallow: /pages/admin.html

# Allow all content pages
Allow: /pages/
Allow: /blog.html
Allow: /index.html
Allow: /pages/post.html
Allow: /pages/article.html
Allow: /pages/categories.html
Allow: /pages/about.html
Allow: /pages/contact.html
`;

// Get robots.txt
router.get('/robots.txt', (req, res) => {
    try {
        const db = getDb();
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('robotsTxt');
        const content = setting?.value || DEFAULT_ROBOTS;

        res.type('text/plain');
        res.send(content);
    } catch (err) {
        console.error('Robots.txt error:', err);
        res.type('text/plain');
        res.send(DEFAULT_ROBOTS);
    }
});

// Get sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
    try {
        const db = getDb();
        const settingDomain = db.prepare('SELECT value FROM settings WHERE key = ?').get('siteDomain');
        const baseUrl = settingDomain?.value || 'https://gammy.space';

        // Get all published articles
        const articles = db.prepare(`
            SELECT slug, created_at
            FROM articles
            WHERE status = 'published'
            ORDER BY created_at DESC
        `).all();

        // Get all published posts
        const posts = db.prepare(`
            SELECT slug, created_at
            FROM posts
            ORDER BY created_at DESC
        `).all();

        // Get all categories
        const categories = db.prepare('SELECT slug FROM categories').all();

        const now = new Date().toISOString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Main pages -->
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${now}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/blog.html</loc>
        <lastmod>${now}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/pages/categories.html</loc>
        <lastmod>${now}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/pages/about.html</loc>
        <lastmod>${now}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
    <url>
        <loc>${baseUrl}/pages/contact.html</loc>
        <lastmod>${now}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
`;

        // Add categories
        for (const cat of categories) {
            xml += `    <url>
        <loc>${baseUrl}/pages/categories.html?cat=${cat.slug}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        }

        // Add articles (high priority)
        for (const article of articles) {
            const lastmod = article.created_at || now;
            xml += `    <url>
        <loc>${baseUrl}/pages/article.html?slug=${article.slug}</loc>
        <lastmod>${new Date(lastmod).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;
        }

        // Add posts (medium priority - also indexable!)
        for (const post of posts) {
            const lastmod = post.created_at || now;
            xml += `    <url>
        <loc>${baseUrl}/pages/post.html?slug=${post.slug}</loc>
        <lastmod>${new Date(lastmod).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        }

        xml += `</urlset>`;

        res.type('application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap error:', err);
        res.status(500).type('text/plain').send('Error generating sitemap');
    }
});

// Get robots content for admin (API)
router.get('/api/robots', (req, res) => {
    try {
        const db = getDb();
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('robotsTxt');
        res.json({
            content: setting?.value || DEFAULT_ROBOTS,
            isDefault: !setting?.value
        });
    } catch (err) {
        console.error('Get robots API error:', err);
        res.status(500).json({ error: 'Failed to get robots.txt' });
    }
});

// Update robots content (admin only)
router.put('/api/robots', (req, res) => {
    try {
        const { content } = req.body;
        const db = getDb();

        db.prepare(`
            INSERT INTO settings (key, value) VALUES ('robotsTxt', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run(content, content);

        res.json({ success: true });
    } catch (err) {
        console.error('Update robots error:', err);
        res.status(500).json({ error: 'Failed to update robots.txt' });
    }
});

// Get sitemap settings for admin
router.get('/api/sitemap-settings', (req, res) => {
    try {
        const db = getDb();
        const domainSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('siteDomain');

        res.json({
            domain: domainSetting?.value || 'https://gammy.space'
        });
    } catch (err) {
        console.error('Get sitemap settings error:', err);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update sitemap settings
router.put('/api/sitemap-settings', (req, res) => {
    try {
        const { domain } = req.body;
        const db = getDb();

        db.prepare(`
            INSERT INTO settings (key, value) VALUES ('siteDomain', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run(domain, domain);

        res.json({ success: true });
    } catch (err) {
        console.error('Update sitemap settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
