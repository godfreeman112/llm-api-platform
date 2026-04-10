# 企业大模型API统一访问平台

一个为企业内部提供的大模型API统一访问、管理和监控平台。

## 功能特性

### 核心功能
- ✅ **用户管理系统** - 支持多用户注册、登录、权限管理
- ✅ **多模型支持** - 可配置多个大模型API（OpenAI、Anthropic、百度文心、阿里通义等）
- ✅ **视频生成** - 支持火山引擎 Seedance 2.0 等视频生成模型 🆕
  - 🎬 Chat界面集成：对话中直接查看和播放生成的视频
  - 🎨 专用页面：完整的视频生成工作台，支持图生视频
  - ⏱️ 智能轮询：自动查询任务状态，实时显示进度
  - 💾 多种导出：下载视频、复制链接、新窗口打开
- ✅ **图像生成** - 支持 DALL-E、Seedream 等图像生成模型
- ✅ **API使用监控** - 实时监控API调用次数、Token消耗、费用统计
- ✅ **配额管理** - 为每个用户设置使用配额
- ✅ **对话测试** - 内置聊天界面，可直接测试模型
- ✅ **使用统计** - 可视化图表展示使用趋势和分布

### 技术栈
- **前端**: Vue 3 + Element Plus + ECharts
- **后端**: Node.js + Express
- **数据库**: SQLite (轻量级，无需额外配置)
- **部署**: Docker + Docker Compose

## 快速开始

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

### 一键部署

#### Linux/Mac
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Windows
```bash
deploy.bat
```

### 手动部署

1. **克隆项目**
```bash
git clone <repository-url>
cd llm-api-platform
```

2. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，修改必要配置
```

3. **启动服务**
```bash
docker-compose up -d --build
```

4. **访问应用**
打开浏览器访问: http://localhost:8080

默认管理员账号:
- 用户名: `admin`
- 密码: `admin123456`

## 项目结构

```
llm-api-platform/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   ├── stores/          # Pinia状态管理
│   │   ├── api/             # API接口
│   │   └── router/          # 路由配置
│   ├── package.json
│   └── vite.config.js
├── backend/                  # 后端项目
│   ├── routes/              # API路由
│   ├── middleware/          # 中间件
│   ├── database.js          # 数据库配置
│   ├── server.js            # 入口文件
│   └── package.json
├── docker-compose.yml       # Docker编排
├── Dockerfile.frontend      # Docker构建文件
├── deploy.sh                # Linux部署脚本
├── deploy.bat               # Windows部署脚本
└── README.md
```

## 配置说明

### 环境变量 (.env)

```env
# JWT密钥 (生产环境务必修改)
JWT_SECRET=your-secret-key
```

### 添加视频生成模型 (Seedance 2.0)

平台现已支持火山引擎的 **Seedance 2.0** 视频生成大模型。

#### 快速开始

1. **获取API密钥**
   - 访问 [火山引擎官网](https://www.volcengine.com/)
   - 完成企业实名认证
   - 在火山方舟控制台申请 Seedance 2.0 API
   - 获取 API Key 和 Endpoint

2. **添加模型**
   - 使用管理员账号登录平台
   - 进入“模型管理”页面
   - 点击“添加模型”
   - 选择模型类型：**视频生成模型**
   - 填写以下信息：
     ```
     模型名称: seedance-2.0-pro
     API端点: https://ark.cn-beijing.volces.com/api/v3/videos/generations
     API密钥: <您的API Key>
     视频时长: 5s / 10s / 15s
     视频分辨率: 720p / 1080p
     输出格式: MP4 / WEBM
     ```

3. **测试连接**
   - 保存后点击“测试”按钮
   - 验证API连接是否正常

📖 详细配置指南请查看：[SEEDANCE_SETUP.md](./SEEDANCE_SETUP.md)

#### 使用视频生成功能

平台提供两种方式使用视频生成模型：

**方式一：Chat界面（推荐新手）**
1. 在首页选择视频模型，进入Chat页面
2. 输入提示词，例如：`一个年轻女性在樱花树下跳芭蕾舞，电影级画面`
3. 发送消息后，系统会返回任务ID
4. 点击“查询生成结果”按钮
5. 等待2-5分钟，视频会自动显示在对话中
6. 可以下载、复制或在新窗口打开视频

**方式二：专用页面（推荐高级用户）**
1. 访问 http://localhost:8070/video-generate
2. 填写提示词、选择参数（时长、分辨率）
3. 可选上传参考图片进行图生视频
4. 点击“生成视频”按钮
5. 等待生成完成，视频会自动显示
6. 所有历史视频会保存在页面底部

💡 更多使用技巧请查看：[VIDEO_USER_GUIDE.md](./VIDEO_USER_GUIDE.md)

# 管理员初始密码
ADMIN_PASSWORD=admin123456

# 服务器端口
PORT=8080
```

### 添加新模型

1. 以管理员身份登录
2. 进入"模型管理"页面
3. 点击"添加模型"
4. 填写模型信息:
   - 模型名称
   - 提供商 (OpenAI/Anthropic/百度/阿里等)
   - API端点
   - API密钥
   - 温度参数
   - 最大Token数

### 配置示例

#### OpenAI GPT
```
名称: GPT-4
提供商: OpenAI
API端点: https://api.openai.com/v1/chat/completions
API密钥: sk-xxxxxxxxxxxxx
```

#### 百度文心一言
```
名称: ERNIE-Bot
提供商: 百度文心
API端点: https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions
API密钥: 您的access_token
```

#### 阿里通义千问
```
名称: Qwen-Max
提供商: 阿里通义
API端点: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
API密钥: 您的API-Key
```

## 用户管理

### 创建用户
1. 管理员进入"用户管理"
2. 点击"添加用户"
3. 填写用户信息
4. 设置配额 (0表示无限制)

### 重置密码
在用户列表中点击"重置密码"，密码将重置为 `123456`

## 监控与统计

### 查看统计数据
- **总调用次数** - 指定时间段内的API调用总数
- **Token消耗** - 输入和输出Token总数
- **费用统计** - 根据Token消耗计算的费用
- **活跃用户** - 有使用记录的用户数

### 使用趋势图
- 近7天/30天/90天的调用趋势
- 模型使用分布饼图
- 用户使用情况排行

## 运维管理

### 查看日志
```bash
docker-compose logs -f
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 备份数据
```bash
./deploy.sh
# 选择选项 7) 备份数据
```

数据存储在Docker卷 `llm-api-platform_llm-data` 中

### 恢复数据
```bash
docker run --rm \
  -v llm-api-platform_llm-data:/data \
  -v /path/to/backup:/backup \
  alpine tar xzf /backup/data.tar.gz -C /data
```

## 安全建议

1. **修改默认密码** - 首次登录后立即修改管理员密码
2. **设置强JWT密钥** - 使用随机字符串作为JWT_SECRET
3. **HTTPS配置** - 生产环境建议配置HTTPS
4. **网络隔离** - 部署在内网，限制外网访问
5. **定期备份** - 定期备份数据库文件
6. **更新依赖** - 定期检查并更新依赖包

## API接口文档

### 认证接口

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123456"
}
```

#### 获取当前用户
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 聊天接口

#### 发送消息
```http
POST /api/chat/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "model": 1,
  "message": "你好",
  "history": []
}
```

### 模型管理 (仅管理员)

#### 获取模型列表
```http
GET /api/models
Authorization: Bearer <token>
```

#### 创建模型
```http
POST /api/models
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "GPT-4",
  "provider": "openai",
  "apiEndpoint": "https://api.openai.com/v1/chat/completions",
  "apiKey": "sk-xxx",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### 监控接口 (仅管理员)

#### 获取统计数据
```http
GET /api/monitor/stats?period=7d
Authorization: Bearer <token>
```

#### 获取使用趋势
```http
GET /api/monitor/usage-trend?period=7d
Authorization: Bearer <token>
```

## 常见问题

### 1. 端口冲突
如果8080端口被占用，修改 `.env` 中的 `PORT` 或 `docker-compose.yml` 中的端口映射

### 2. 数据库文件位置
数据库文件存储在Docker卷中，可通过以下命令查看:
```bash
docker volume inspect llm-api-platform_llm-data
```

### 3. 忘记管理员密码
删除数据库文件重新初始化:
```bash
docker-compose down
docker volume rm llm-api-platform_llm-data
docker-compose up -d
```

### 4. 模型连接失败
- 检查API密钥是否正确
- 检查API端点是否可访问
- 查看后端日志排查具体错误

## 技术支持

如有问题，请提交Issue或联系技术支持团队。

## 许可证

MIT License
