/**
 * Media Routes - File uploads
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = uuidv4() + ext;
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Get all media
router.get('/', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const media = db.prepare('SELECT * FROM media ORDER BY created_at DESC').all();
        res.json(media);
    } catch (err) {
        console.error('Get media error:', err);
        res.status(500).json({ error: 'Failed to get media' });
    }
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const db = getDb();

        const result = db.prepare(`
            INSERT INTO media (filename, original_name, mime_type, size, path)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            '/uploads/' + req.file.filename
        );

        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
        res.json(media);
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Upload base64 image
router.post('/upload-base64', authMiddleware, (req, res) => {
    try {
        const { data, filename } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Extract base64 data
        const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 data' });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Get extension from mime type
        const extMap = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp'
        };
        const ext = extMap[mimeType] || '.jpg';

        // Generate filename
        const newFilename = uuidv4() + ext;
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, newFilename);

        // Write file
        fs.writeFileSync(filePath, base64Data, 'base64');

        // Get file size
        const stats = fs.statSync(filePath);

        // Save to DB
        const db = getDb();
        const result = db.prepare(`
            INSERT INTO media (filename, original_name, mime_type, size, path)
            VALUES (?, ?, ?, ?, ?)
        `).run(newFilename, filename || newFilename, mimeType, stats.size, '/uploads/' + newFilename);

        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
        res.json(media);
    } catch (err) {
        console.error('Upload base64 error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Delete media
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const db = getDb();
        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);

        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Delete file
        const filePath = path.join(__dirname, '..', '..', media.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from DB
        db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);

        res.json({ message: 'Media deleted' });
    } catch (err) {
        console.error('Delete media error:', err);
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

module.exports = router;
