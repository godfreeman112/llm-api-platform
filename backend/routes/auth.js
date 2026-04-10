const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: '账户已被禁用' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // 生成token
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      quota: user.quota,
      usedQuota: user.used_quota
    };

    res.json({
      token,
      user: userInfo
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await get(
      'SELECT id, username, email, role, quota, used_quota, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '请提供当前密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码长度不能小于6位' });
    }

    // 获取用户
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    // 验证旧密码
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await run('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [hashedPassword, req.user.id]);

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

module.exports = router;
