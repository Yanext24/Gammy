/**
 * Posts Routes - Feed posts CRUD, likes
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware, optionalAuth, adminMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// Generate slug from text (translit first words)
function generateSlug(text, db) {
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };

    // Take first 5 words
    const words = text.trim().split(/\s+/).slice(0, 5).join(' ');

    let slug = words.toLowerCase()
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);

    // Check for duplicates and add number if needed
    if (db) {
        let baseSlug = slug;
        let counter = 1;
        while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    return slug;
}

// Get all posts (with pagination)
router.get('/', optionalAuth, (req, res) => {
    try {
        const db = getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const tag = req.query.tag;
        const search = req.query.search;

        let query = `
            SELECT p.*, u.avatar as author_avatar,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM posts';
        let params = [];

        if (tag) {
            query += ` WHERE p.tags LIKE ?`;
            countQuery += ` WHERE tags LIKE ?`;
            params.push(`%${tag}%`);
        } else if (search) {
            query += ` WHERE p.content LIKE ?`;
            countQuery += ` WHERE content LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;

        const posts = db.prepare(query).all(...params, limit, offset);
        const total = db.prepare(countQuery).get(...params.slice(0, params.length > 0 ? 1 : 0)).total;

        // Check if current user liked each post
        if (req.user) {
            posts.forEach(post => {
                const liked = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
                post.user_liked = !!liked;
            });
        }

        // Parse JSON fields
        posts.forEach(post => {
            post.images = post.images ? JSON.parse(post.images) : [];
            post.tags = post.tags ? JSON.parse(post.tags) : [];
        });

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get posts error:', err);
        res.status(500).json({ error: 'Failed to get posts' });
    }
});

// Get post by slug
router.get('/slug/:slug', optionalAuth, (req, res) => {
    try {
        const db = getDb();
        const post = db.prepare(`
            SELECT p.*, u.avatar as author_avatar,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.slug = ?
        `).get(req.params.slug);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Increment views
        db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
        post.views++;

        // Check if user liked
        if (req.user) {
            const liked = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
            post.user_liked = !!liked;
        }

        post.images = post.images ? JSON.parse(post.images) : [];
        post.tags = post.tags ? JSON.parse(post.tags) : [];

        res.json(post);
    } catch (err) {
        console.error('Get post error:', err);
        res.status(500).json({ error: 'Failed to get post' });
    }
});

// Get post by ID
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const db = getDb();
        const post = db.prepare(`
            SELECT p.*,
                   (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                   (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
            FROM posts p WHERE p.id = ?
        `).get(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (req.user) {
            const liked = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
            post.user_liked = !!liked;
        }

        post.images = post.images ? JSON.parse(post.images) : [];
        post.tags = post.tags ? JSON.parse(post.tags) : [];

        res.json(post);
    } catch (err) {
        console.error('Get post error:', err);
        res.status(500).json({ error: 'Failed to get post' });
    }
});

// Create post (supports anonymous if feedAllowAnonymous is enabled)
router.post('/', optionalAuth, (req, res) => {
    try {
        const { content, images, tags } = req.body;
        const db = getDb();

        // Check if anonymous posting is allowed
        const allowAnonymous = db.prepare("SELECT value FROM settings WHERE key = 'feedAllowAnonymous'").get();
        const isAnonymousAllowed = allowAnonymous && (allowAnonymous.value === 'true' || allowAnonymous.value === '1');

        if (!req.user && !isAnonymousAllowed) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const slug = generateSlug(content, db);

        const authorId = req.user ? req.user.id : null;
        const authorName = req.user ? req.user.name : 'Гость';

        const result = db.prepare(`
            INSERT INTO posts (slug, content, images, tags, author_id, author_name)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            slug,
            content,
            JSON.stringify(images || []),
            JSON.stringify(tags || []),
            authorId,
            authorName
        );

        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
        post.images = JSON.parse(post.images);
        post.tags = JSON.parse(post.tags);
        post.likes_count = 0;
        post.comments_count = 0;

        res.json(post);
    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Update post
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { content, images, tags } = req.body;
        const db = getDb();

        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Only author or admin can edit
        if (post.author_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare(`
            UPDATE posts SET content = ?, images = ?, tags = ?
            WHERE id = ?
        `).run(
            content,
            JSON.stringify(images || []),
            JSON.stringify(tags || []),
            req.params.id
        );

        const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
        updated.images = JSON.parse(updated.images);
        updated.tags = JSON.parse(updated.tags);

        res.json(updated);
    } catch (err) {
        console.error('Update post error:', err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Delete post
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const db = getDb();

        const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Only author or admin can delete
        if (post.author_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Like/unlike post
router.post('/:id/like', optionalAuth, (req, res) => {
    try {
        const db = getDb();
        const postId = req.params.id;
        const userId = req.user?.id;
        const userIp = req.ip;

        // Check if already liked
        let existing;
        if (userId) {
            existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
        } else {
            existing = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_ip = ?').get(postId, userIp);
        }

        if (existing) {
            // Unlike
            db.prepare('DELETE FROM post_likes WHERE id = ?').run(existing.id);
        } else {
            // Like
            db.prepare('INSERT INTO post_likes (post_id, user_id, user_ip) VALUES (?, ?, ?)').run(postId, userId, userIp);

            // Create notification for post owner
            const post = db.prepare('SELECT author_id, content FROM posts WHERE id = ?').get(postId);
            if (post && post.author_id) {
                const sourceName = req.user?.name || 'Гость';
                const preview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
                createNotification(db, {
                    userId: post.author_id,
                    type: 'like_post',
                    sourceUserId: userId,
                    sourceUserName: sourceName,
                    postId: parseInt(postId),
                    message: `${sourceName} оценил ваш пост: "${preview}"`
                });
            }
        }

        const likesCount = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').get(postId).count;

        res.json({ liked: !existing, likes_count: likesCount });
    } catch (err) {
        console.error('Like post error:', err);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// Get top tags
router.get('/stats/tags', (req, res) => {
    try {
        const db = getDb();
        const posts = db.prepare('SELECT tags FROM posts').all();

        const tagCounts = {};
        posts.forEach(post => {
            const tags = post.tags ? JSON.parse(post.tags) : [];
            tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag, count]) => ({ tag, count }));

        res.json(sortedTags);
    } catch (err) {
        console.error('Get tags error:', err);
        res.status(500).json({ error: 'Failed to get tags' });
    }
});

// Get top authors
router.get('/stats/authors', (req, res) => {
    try {
        const db = getDb();
        const authors = db.prepare(`
            SELECT u.id, u.name, u.avatar, COUNT(p.id) as posts_count
            FROM users u
            JOIN posts p ON p.author_id = u.id
            GROUP BY u.id
            ORDER BY posts_count DESC
            LIMIT 5
        `).all();

        res.json(authors);
    } catch (err) {
        console.error('Get authors error:', err);
        res.status(500).json({ error: 'Failed to get authors' });
    }
});

// Get feed stats (admin)
router.get('/stats/overview', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();

        const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
        const totalViews = db.prepare('SELECT SUM(views) as sum FROM posts').get().sum || 0;
        const totalLikes = db.prepare('SELECT COUNT(*) as count FROM post_likes').get().count;
        const totalComments = db.prepare('SELECT COUNT(*) as count FROM post_comments').get().count;

        // Posts per day (last 7 days)
        const postsPerDay = db.prepare(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM posts
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `).all();

        res.json({
            totalPosts,
            totalViews,
            totalLikes,
            totalComments,
            postsPerDay
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
