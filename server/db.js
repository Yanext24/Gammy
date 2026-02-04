/**
 * Database - SQLite with better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use /data for Render persistent disk, fallback to local data folder
const dataDir = process.env.NODE_ENV === 'production' ? '/data' : path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'gammy.db');

let db;

function getDb() {
    if (!db) {
        const fs = require('fs');
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
    }
    return db;
}

function init() {
    const db = getDb();

    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            role TEXT DEFAULT 'user',
            bio TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Posts (feed) table
    db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            content TEXT NOT NULL,
            images TEXT,
            tags TEXT,
            author_id INTEGER,
            author_name TEXT,
            views INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    // Post likes table
    db.exec(`
        CREATE TABLE IF NOT EXISTS post_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER,
            user_ip TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    `);

    // Post comments table
    db.exec(`
        CREATE TABLE IF NOT EXISTS post_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER,
            author_name TEXT NOT NULL,
            author_email TEXT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    `);

    // Articles (blog) table
    db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            excerpt TEXT,
            content TEXT,
            image TEXT,
            category TEXT,
            status TEXT DEFAULT 'draft',
            views INTEGER DEFAULT 0,
            author_id INTEGER,
            seo_title TEXT,
            seo_description TEXT,
            seo_keywords TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    // Article comments table
    db.exec(`
        CREATE TABLE IF NOT EXISTS article_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            user_id INTEGER,
            author_name TEXT NOT NULL,
            author_email TEXT,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
        )
    `);

    // Categories table
    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            color TEXT DEFAULT '#6366f1',
            icon TEXT,
            show_on_home INTEGER DEFAULT 0,
            show_in_footer INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: add show_in_footer column if missing
    try {
        db.exec(`ALTER TABLE categories ADD COLUMN show_in_footer INTEGER DEFAULT 1`);
    } catch (e) {
        // Column already exists
    }

    // Migration: add notification preferences columns to users table
    try {
        db.exec(`ALTER TABLE users ADD COLUMN notify_comments INTEGER DEFAULT 1`);
    } catch (e) {
        // Column already exists
    }
    try {
        db.exec(`ALTER TABLE users ADD COLUMN notify_newsletter INTEGER DEFAULT 0`);
    } catch (e) {
        // Column already exists
    }

    // Media table
    db.exec(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT,
            mime_type TEXT,
            size INTEGER,
            path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    // Notifications table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            source_user_id INTEGER,
            source_user_name TEXT,
            post_id INTEGER,
            article_id INTEGER,
            comment_id INTEGER,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create default admin user if not exists
    const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
    if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare(`
            INSERT INTO users (email, password, name, role)
            VALUES (?, ?, ?, ?)
        `).run('admin@gammy.blog', hashedPassword, 'Администратор', 'admin');
        console.log('Default admin created: admin@gammy.blog / admin123');
    }

    // Create default categories if not exists
    const categoriesExist = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    if (categoriesExist.count === 0) {
        const defaultCategories = [
            { name: 'Технологии', slug: 'tech', color: '#6366f1' },
            { name: 'Дизайн', slug: 'design', color: '#ec4899' },
            { name: 'Разработка', slug: 'dev', color: '#10b981' },
            { name: 'Новости', slug: 'news', color: '#f59e0b' }
        ];
        const insert = db.prepare('INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)');
        defaultCategories.forEach(cat => insert.run(cat.name, cat.slug, cat.color));
    }

    console.log('Database initialized');
}

module.exports = { getDb, init };
