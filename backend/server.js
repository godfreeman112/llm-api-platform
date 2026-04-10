const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const modelRoutes = require('./routes/models');
const userRoutes = require('./routes/users');
const monitorRoutes = require('./routes/monitor');
const imageRoutes = require('./routes/image');

const app = express();
const PORT = process.env.PORT || 8080;

// 中间件
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/image', imageRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  // Docker 环境中前端文件在 /app/dist（server.js 就在 /app 目录）
  // 本地开发环境中前端文件在 ../frontend/dist（server.js 在 backend 目录）
  const distPath = path.join(__dirname, 'dist');
  const localFrontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  
  // 优先使用 Docker 环境的路径，如果不存在则使用本地路径
  const finalPath = require('fs').existsSync(distPath) ? distPath : localFrontendPath;
  
  app.use(express.static(finalPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(finalPath, 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    await initDatabase();
    console.log('✓ 数据库初始化成功');
    
    // 启动服务
    app.listen(PORT, () => {
      console.log(`✓ 服务器运行在 http://localhost:${PORT}`);
      console.log(`✓ 环境: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
