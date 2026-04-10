const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { query, get, run } = require('../database');

const router = express.Router();

// 获取用户列表（仅管理员）
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, role, quota, used_quota as usedQuota, status, last_login_at as lastLoginAt, created_at as createdAt FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 创建用户（仅管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, quota, status } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 检查用户名是否已存在
    const existingUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (username, email, password, role, quota, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, role || 'user', quota || 0, status || 'active']
    );

    res.status(201).json({
      id: result.lastID,
      message: '用户创建成功'
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 更新用户（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, quota, status } = req.body;

    // 检查用户是否存在
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 如果修改了用户名，检查是否重复
    if (username && username !== user.username) {
      const existingUser = await get('SELECT * FROM users WHERE username = ? AND id != ?', [username, id]);
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' });
      }
    }

    await run(
      `UPDATE users 
       SET username = ?, email = ?, role = ?, quota = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        username || user.username,
        email !== undefined ? email : user.email,
        role || user.role,
        quota !== undefined ? quota : user.quota,
        status || user.status,
        id
      ]
    );

    res.json({ message: '用户更新成功' });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }

    // 检查用户是否存在
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    await run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 重置密码（仅管理员）
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 生成默认密码并哈希
    const defaultPassword = '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [hashedPassword, id]);

    res.json({ 
      message: '密码已重置',
      defaultPassword: defaultPassword
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
