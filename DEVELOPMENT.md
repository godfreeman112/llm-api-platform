# 开发环境搭建指南

## 本地开发（不使用Docker）

### 前置要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

#### 1. 安装后端依赖

```bash
cd backend
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

#### 3. 初始化数据库和示例数据

```bash
npm run seed
```

#### 4. 启动后端服务

```bash
npm run dev
# 后端运行在 http://localhost:8080
```

#### 5. 安装前端依赖（新终端）

```bash
cd frontend
npm install
```

#### 6. 启动前端开发服务器

```bash
npm run dev
# 前端运行在 http://localhost:3000
```

### 访问应用

- 前端开发界面: http://localhost:3000
- 后端API: http://localhost:8080
- API健康检查: http://localhost:8080/api/health

### 默认账户

**管理员:**
- 用户名: `admin`
- 密码: `admin123456`

**普通用户:**
- 用户名: `demo`
- 密码: `user123456`

## 项目架构

### 后端结构

```
backend/
├── routes/              # API路由
│   ├── auth.js         # 认证相关
│   ├── chat.js         # 聊天相关
│   ├── models.js       # 模型管理
│   ├── users.js        # 用户管理
│   └── monitor.js      # 监控统计
├── middleware/          # 中间件
│   └── auth.js         # JWT认证
├── database.js          # 数据库配置
├── server.js            # 入口文件
└── seed.js             # 示例数据
```

### 前端结构

```
frontend/
├── src/
│   ├── views/          # 页面组件
│   │   ├── Login.vue
│   │   ├── Home.vue
│   │   ├── Chat.vue
│   │   ├── Models.vue
│   │   ├── Users.vue
│   │   ├── Monitor.vue
│   │   └── Profile.vue
│   ├── stores/         # Pinia状态管理
│   │   └── auth.js
│   ├── api/            # API接口封装
│   │   └── index.js
│   ├── router/         # 路由配置
│   │   └── index.js
│   ├── App.vue
│   └── main.js
```

## API接口说明

### 基础URL
- 开发环境: `http://localhost:8080/api`
- 生产环境: `/api`

### 认证
大多数API需要在Header中携带JWT Token:
```
Authorization: Bearer <your-token>
```

### 主要接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /auth/login | 登录 | 公开 |
| GET | /auth/me | 获取当前用户信息 | 已登录 |
| POST | /chat/send | 发送消息 | 已登录 |
| GET | /chat/history | 获取对话历史 | 已登录 |
| GET | /models | 获取模型列表 | 已登录 |
| POST | /models | 创建模型 | 管理员 |
| PUT | /models/:id | 更新模型 | 管理员 |
| DELETE | /models/:id | 删除模型 | 管理员 |
| GET | /users | 获取用户列表 | 管理员 |
| POST | /users | 创建用户 | 管理员 |
| GET | /monitor/stats | 获取统计数据 | 管理员 |
| GET | /monitor/usage-trend | 获取使用趋势 | 管理员 |

## 开发提示

### 后端开发

1. **添加新路由**: 在 `routes/` 目录创建新文件，并在 `server.js` 中注册
2. **数据库操作**: 使用 `database.js` 提供的 `query`, `get`, `run` 方法
3. **错误处理**: 使用try-catch，返回统一的错误格式

### 前端开发

1. **添加新页面**: 在 `views/` 目录创建Vue组件，并在 `router/index.js` 中配置路由
2. **状态管理**: 使用Pinia，在 `stores/` 目录定义store
3. **API调用**: 使用 `api/index.js` 中封装的方法

### 调试技巧

**后端日志:**
```bash
# 查看所有请求日志
NODE_ENV=development npm run dev
```

**前端调试:**
- 打开浏览器开发者工具
- Vue DevTools扩展可查看组件状态

**数据库查看:**
```bash
# 使用SQLite命令行工具
sqlite3 data/llm-platform.db

# 查看表
.tables

# 查询数据
SELECT * FROM users;
```

## 测试

### API测试 (使用curl)

```bash
# 登录获取token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123456"}'

# 使用token访问API
curl http://localhost:8080/api/models \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 常见问题

### 端口被占用

修改对应服务的端口配置:
- 后端: 修改 `.env` 中的 `PORT`
- 前端: 修改 `vite.config.js` 中的 `port`

### 数据库锁定

如果遇到数据库锁定错误:
```bash
# 删除数据库文件重新初始化
rm data/llm-platform.db
npm run seed
```

### 跨域问题

开发环境下，Vite代理已配置好。生产环境需要配置CORS或使用Nginx反向代理。
