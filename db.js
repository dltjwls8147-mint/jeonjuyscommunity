// 전주영생고등학교 커뮤니티 데이터베이스
// 작성자: 라수호

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = new Database(path.join(__dirname, 'community.db'));

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((col) => col.name === columnName);
}

export function initDB() {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT NOT NULL UNIQUE,
      account_name TEXT UNIQUE,
      email     TEXT NOT NULL,
      password  TEXT NOT NULL,
      level     INTEGER DEFAULT 1,
      exp       INTEGER DEFAULT 0,
      role      TEXT DEFAULT 'user',
      status    TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id    TEXT NOT NULL,
      title       TEXT NOT NULL,
      author      TEXT NOT NULL,
      author_ip   TEXT,
      password    TEXT NOT NULL,
      content     TEXT NOT NULL,
      views       INTEGER DEFAULT 0,
      likes       INTEGER DEFAULT 0,
      updated_at  DATETIME,
      created_at  DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL REFERENCES posts(id),
      author      TEXT NOT NULL,
      author_ip   TEXT,
      password    TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS post_votes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id      INTEGER NOT NULL REFERENCES posts(id),
      vote_type    TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
      voter_ip     TEXT NOT NULL,
      voter_token  TEXT NOT NULL,
      created_at   DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_board ON posts(board_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_votes_post ON post_votes(post_id, vote_type);
    CREATE INDEX IF NOT EXISTS idx_votes_ip ON post_votes(post_id, voter_ip);
    CREATE INDEX IF NOT EXISTS idx_votes_token ON post_votes(post_id, voter_token);
    
    -- 해시태그 테이블: 게시글에 연결된 태그 저장
    CREATE TABLE IF NOT EXISTS hashtags (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
    
    -- 신고 기록: 각 게시글에 대한 신고를 저장
    CREATE TABLE IF NOT EXISTS reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      reporter    TEXT,
      reason      TEXT,
      created_at  DATETIME DEFAULT (datetime('now','localtime'))
    );

    -- 작성자 별 삭제 누적 통계
    CREATE TABLE IF NOT EXISTS author_stats (
      author        TEXT PRIMARY KEY,
      deleted_count INTEGER DEFAULT 0
    );

    -- 작성자 차단(밴): expires_at 이후 자동 해제
    CREATE TABLE IF NOT EXISTS bans (
      author      TEXT PRIMARY KEY,
      expires_at  DATETIME NOT NULL
    );

    -- 해시태그
    CREATE TABLE IF NOT EXISTS hashtags (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id   INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag       TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
    CREATE INDEX IF NOT EXISTS idx_hashtags_post ON hashtags(post_id);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author     TEXT NOT NULL,
      author_ip  TEXT,
      content    TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_id ON chat_messages(id DESC);
  `);

  if (!hasColumn('posts', 'concept_recommends')) {
    db.exec('ALTER TABLE posts ADD COLUMN concept_recommends INTEGER DEFAULT 0');
    if (hasColumn('posts', 'likes')) {
      db.exec('UPDATE posts SET concept_recommends = likes WHERE concept_recommends = 0 AND likes > 0');
    }
  }

  if (!hasColumn('posts', 'dislikes')) {
    db.exec('ALTER TABLE posts ADD COLUMN dislikes INTEGER DEFAULT 0');
  }

  if (!hasColumn('users', 'level')) {
    db.exec('ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1');
    db.exec('ALTER TABLE users ADD COLUMN exp INTEGER DEFAULT 0');
  }

  if (!hasColumn('users', 'account_name')) {
    db.exec('ALTER TABLE users ADD COLUMN account_name TEXT');

    const users = db.prepare('SELECT id, username FROM users ORDER BY id').all();
    const used = new Set();
    const updateAccountName = db.prepare('UPDATE users SET account_name = ? WHERE id = ?');

    for (const user of users) {
      const cleaned = String(user.username || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      const base = cleaned.length >= 3 ? cleaned : `user${user.id}`;
      let accountName = base;
      let suffix = 1;

      while (used.has(accountName)) {
        const tail = String(suffix++);
        accountName = `${base.slice(0, Math.max(3, 20 - tail.length))}${tail}`;
      }

      used.add(accountName);
      updateAccountName.run(accountName, user.id);
    }
  }

  if (!hasColumn('users', 'role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  }

  if (!hasColumn('users', 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }

  if (!hasColumn('posts', 'author_ip')) {
    db.exec('ALTER TABLE posts ADD COLUMN author_ip TEXT');
  }

  if (!hasColumn('posts', 'updated_at')) {
    db.exec('ALTER TABLE posts ADD COLUMN updated_at DATETIME');
  }

  if (!hasColumn('comments', 'author_ip')) {
    db.exec('ALTER TABLE comments ADD COLUMN author_ip TEXT');
  }

  db.exec(`
    UPDATE users
    SET account_name = 'user' || id
    WHERE account_name IS NULL OR trim(account_name) = '';

    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR trim(role) = '';

    UPDATE users
    SET status = 'active'
    WHERE status IS NULL OR trim(status) = '';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account_name ON users(account_name);
  `);

  const admin = db.prepare('SELECT id FROM users WHERE account_name = ?').get('admin');
  if (admin) {
    db.prepare("UPDATE users SET password = 'admin1234', role = 'admin', status = 'active' WHERE id = ?").run(admin.id);
  } else {
    let username = '관리자';
    let suffix = 1;
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
      username = `관리자${suffix++}`;
    }

    db.prepare(`
      INSERT INTO users (username, account_name, email, password, role, status)
      VALUES (?, 'admin', 'admin@youngsaeng.local', 'admin1234', 'admin', 'active')
    `).run(username);
  }
}
