import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'cache.db');
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Ensure the database file exists or is created
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS repo_trees (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS file_contents (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Cleanup old entries on startup
const now = Date.now();
db.prepare('DELETE FROM repo_trees WHERE created_at < ?').run(now - TTL_MS);
db.prepare('DELETE FROM file_contents WHERE created_at < ?').run(now - TTL_MS);

export const cacheService = {
  getTree(owner: string, repo: string, branch: string) {
    const id = `${owner}/${repo}/${branch}`;
    const row = db.prepare('SELECT data, created_at FROM repo_trees WHERE id = ?').get(id) as { data: string, created_at: number } | undefined;

    if (!row) return null;

    if (Date.now() - row.created_at > TTL_MS) {
      db.prepare('DELETE FROM repo_trees WHERE id = ?').run(id);
      return null;
    }

    return JSON.parse(row.data);
  },

  setTree(owner: string, repo: string, branch: string, data: any) {
    const id = `${owner}/${repo}/${branch}`;
    const stmt = db.prepare('INSERT OR REPLACE INTO repo_trees (id, data, created_at) VALUES (?, ?, ?)');
    stmt.run(id, JSON.stringify(data), Date.now());
  },

  getFileContent(owner: string, repo: string, branch: string, filePath: string) {
    const id = `${owner}/${repo}/${branch}/${filePath}`;
    const row = db.prepare('SELECT content, created_at FROM file_contents WHERE id = ?').get(id) as { content: string, created_at: number } | undefined;

    if (!row) return null;

    if (Date.now() - row.created_at > TTL_MS) {
      db.prepare('DELETE FROM file_contents WHERE id = ?').run(id);
      return null;
    }

    return row.content;
  },

  setFileContent(owner: string, repo: string, branch: string, filePath: string, content: string) {
    const id = `${owner}/${repo}/${branch}/${filePath}`;
    const stmt = db.prepare('INSERT OR REPLACE INTO file_contents (id, content, created_at) VALUES (?, ?, ?)');
    stmt.run(id, content, Date.now());
  }
};
