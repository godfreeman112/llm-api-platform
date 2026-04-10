const jwt = require('jsonwebtoken');
const { get } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证JWT token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从数据库获取用户信息
    const user = await get('SELECT id, username, email, role, status FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账户已被禁用' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: '无效的认证令牌' });
  }
}

// 检查是否为管理员
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}

// 生成JWT token
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireAdmin,
  generateToken
};
