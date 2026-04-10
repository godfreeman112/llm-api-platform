const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/llm-platform.db';

// 确保数据目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    // 启用外键支持
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function initDatabase() {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(async () => {
      try {
        // 用户表
        await run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            quota INTEGER DEFAULT 0,
            used_quota INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            api_key TEXT UNIQUE,
            last_login_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 模型表
        await run(`
          CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            model_type TEXT DEFAULT 'chat' CHECK(model_type IN ('chat', 'image', 'video')),
            api_endpoint TEXT NOT NULL,
            api_key TEXT NOT NULL,
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 4096,
            image_size TEXT DEFAULT '1024x1024',
            output_format TEXT DEFAULT 'png',
            response_format TEXT DEFAULT 'url',
            video_duration TEXT DEFAULT '5s',
            video_resolution TEXT DEFAULT '1080p',
            description TEXT,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 对话历史表
        await run(`
          CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            model_id INTEGER NOT NULL,
            title TEXT,
            messages TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
          )
        `);

        // API使用记录表
        await run(`
          CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            model_id INTEGER NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            cost REAL DEFAULT 0,
            request_data TEXT,
            response_data TEXT,
            status TEXT DEFAULT 'success',
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
          )
        `);

        // 数据库迁移：为已存在的models表添加新字段
        try {
          await run(`ALTER TABLE models ADD COLUMN model_type TEXT DEFAULT 'chat'`);
        } catch (e) { /* 字段已存在，忽略 */ }
        
        try {
          await run(`ALTER TABLE models ADD COLUMN image_size TEXT DEFAULT '1024x1024'`);
        } catch (e) { /* 字段已存在，忽略 */ }
        
        try {
          await run(`ALTER TABLE models ADD COLUMN output_format TEXT DEFAULT 'png'`);
        } catch (e) { /* 字段已存在，忽略 */ }
        
        try {
          await run(`ALTER TABLE models ADD COLUMN response_format TEXT DEFAULT 'url'`);
        } catch (e) { /* 字段已存在，忽略 */ }
        
        try {
          await run(`ALTER TABLE models ADD COLUMN video_duration TEXT DEFAULT '5s'`);
        } catch (e) { /* 字段已存在，忽略 */ }
        
        try {
          await run(`ALTER TABLE models ADD COLUMN video_resolution TEXT DEFAULT '1080p'`);
        } catch (e) { /* 字段已存在，忽略 */ }

        // 创建索引
        await run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await run('CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)');
        await run('CREATE INDEX IF NOT EXISTS idx_models_status ON models(status)');
        await run('CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_usage_logs_model_id ON usage_logs(model_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)');

        // 检查是否已有管理员账户
        const admin = await get('SELECT * FROM users WHERE role = ?', ['admin']);
        
        if (!admin) {
          // 创建默认管理员账户
          const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123456', 10);
          await run(
            'INSERT INTO users (username, email, password, role, quota, status) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', 'admin@example.com', hashedPassword, 'admin', 0, 'active']
          );
          console.log('✓ 默认管理员账户已创建 (用户名: admin, 密码: ' + (process.env.ADMIN_PASSWORD || 'admin123456') + ')');
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = {
  getDatabase,
  query,
  get,
  run,
  initDatabase
};
