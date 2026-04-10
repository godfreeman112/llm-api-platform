# 快速启动指南

## 5分钟快速部署

### 步骤1: 确保Docker已安装

```bash
# 检查Docker版本
docker --version
docker-compose --version
```

如果未安装，请访问 [D官网](https://www.docker.com/products/docker-desktop) 下载安装。

### 步骤2: 下载并配置项目

```bash
# 进入项目目录
cd llm-api-platform

# 复制环境配置文件
cp .env.example .env

# (可选) 编辑 .env 文件修改配置
# - JWT_SECRET: 生产环境务必修改为随机字符串
# - ADMIN_PASSWORD: 修改管理员密码
```

### 步骤3: 启动服务

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
# 选择选项 1) 首次部署
```

**Windows:**
```bash
deploy.bat
# 选择选项 1
```

或直接使用Docker命令:
```bash
docker-compose up -d --build
```

### 步骤4: 访问应用

打开浏览器访问: http://localhost:8080

使用默认管理员账号登录:
- 用户名: `admin`
- 密码: `admin123456` (或您在.env中设置的密码)

### 步骤5: 配置第一个模型

1. 登录后，点击左侧菜单 "模型管理"
2. 点击 "添加模型" 按钮
3. 填写模型信息，例如:

```
模型名称: GPT-3.5-Turbo
提供商: OpenAI
API端点: https://api.openai.com/v1/chat/completions
API密钥: sk-your-api-key-here
温度: 0.7
最大Token: 4096
```

4. 点击 "确定" 保存
5. 点击 "测试" 按钮验证连接

### 步骤6: 开始使用

- **对话测试**: 点击 "对话测试" 菜单，选择模型开始聊天
- **用户管理**: 创建普通用户账户供团队成员使用
- **使用监控**: 查看API调用统计和费用

## 下一步

- 阅读 [README.md](README.md) 了解完整功能
- 配置更多模型提供商
- 创建团队成员账户
- 设置用户配额

## 需要帮助?

- 查看 [常见问题](README.md#常见问题)
- 查看日志: `docker-compose logs -f`
- 健康检查: 访问 http://localhost:8080/api/health
