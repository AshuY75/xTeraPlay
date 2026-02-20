// cache.js - Shared SQLite Cache for VPS Cross-Process State
const Database = require('better-sqlite3');
const path = require('path');

// Step 8: Initialize SQLite Database
const db = new Database(path.join(__dirname, 'cache.db'));

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS video_cache (
    id TEXT PRIMARY KEY,
    videoUrl TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Clean up old entries periodically (older than 1 day)
const cleanup = db.prepare(`DELETE FROM video_cache WHERE julianday('now') - julianday(created_at) > 1`);

function set(id, videoUrl) {
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO video_cache (id, videoUrl) VALUES (?, ?)');
        stmt.run(id, videoUrl);
        cleanup.run(); // remove expired
    } catch (err) {
        console.error('[Cache] Set Error:', err.message);
    }
}

function get(id) {
    try {
        const stmt = db.prepare('SELECT videoUrl FROM video_cache WHERE id = ?');
        const row = stmt.get(id);
        return row ? row.videoUrl : null;
    } catch (err) {
        console.error('[Cache] Get Error:', err.message);
        return null;
    }
}

function remove(id) {
    try {
        const stmt = db.prepare('DELETE FROM video_cache WHERE id = ?');
        stmt.run(id);
    } catch (err) {
        console.error('[Cache] Remove Error:', err.message);
    }
}

module.exports = { set, get, remove };
