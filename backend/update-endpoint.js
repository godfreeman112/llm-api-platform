// 更新即梦模型为正确的 Endpoint ID
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('正在更新模型配置...');

db.run(
  "UPDATE models SET name = ? WHERE name = ?",
  ['ep-m-20260409173131-mvnn2', 'doubao-seedream-4.0'],
  function(err) {
    if (err) {
      console.error('更新失败:', err.message);
    } else {
      console.log(`✓ 成功更新 ${this.changes} 条记录`);
      console.log('  旧模型名: doubao-seedream-4.0');
      console.log('  新模型名: ep-m-20260409173131-mvnn2');
    }
    db.close();
  }
);
