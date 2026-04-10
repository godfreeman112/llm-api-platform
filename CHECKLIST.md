# 部署验证清单

## 📋 部署前检查

### 环境准备
- [ ] Docker已安装 (版本 >= 20.10)
  ```bash
  docker --version
  docker-compose --version
  ```

- [ ] 端口8080未被占用
  ```bash
  # Linux/Mac
  lsof -i :8080

  # Windows
  netstat -ano | findstr :8080
  ```

- [ ] 磁盘空间充足 (> 1GB)
  ```bash
  df -h  # Linux/Mac
  ```

### 配置文件
- [ ] `.env` 文件已创建
  ```bash
  cp .env.example .env
  ```

- [ ] JWT_SECRET已修改为随机字符串
  ```bash
  # 生成随机密钥
  openssl rand -base64 32
  ```

- [ ] 管理员密码已修改（非默认值）

## 🚀 部署过程检查

### Docker构建
- [ ] 镜像构建成功
  ```bash
  docker-compose build
  # 应该看到 "Successfully built" 消息
  ```

- [ ] 容器启动成功
  ```bash
  docker-compose up -d
  docker-compose ps
  # 状态应该是 "Up"
  ```

### 服务健康检查
- [ ] API健康检查通过
  ```bash
  curl http://localhost:8080/api/health
  # 应返回: {"status":"ok","timestamp":"..."}
  ```

- [ ] 前端页面可访问
  ```
  浏览器打开: http://localhost:8080
  应该看到登录页面
  ```

### 功能测试
- [ ] 管理员登录成功
  ```
  用户名: admin
  密码: (您在.env中设置的密码)
  ```

- [ ] 首页仪表盘正常显示
  - [ ] 统计卡片显示
  - [ ] 侧边栏菜单正常
  - [ ] 用户信息显示正确

- [ ] 模型管理页面
  - [ ] 可以访问模型管理
  - [ ] 可以看到示例模型
  - [ ] 可以添加新模型

- [ ] 用户管理页面
  - [ ] 可以访问用户管理
  - [ ] 可以创建新用户
  - [ ] 可以重置密码

- [ ] 监控统计页面
  - [ ] 统计数据正常显示
  - [ ] 图表正常渲染

## 🔍 详细功能测试

### 1. 用户认证测试
```bash
# 测试登录API
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 应该返回 token 和 user 信息
```

- [ ] 登录成功返回token
- [ ] token格式正确 (eyJ...)
- [ ] 错误密码返回401

### 2. 模型配置测试
在界面中:
1. 进入"模型管理"
2. 点击"添加模型"
3. 填写测试数据:
   - 名称: Test Model
   - 提供商: custom
   - API端点: https://api.openai.com/v1/chat/completions
   - API密钥: test-key
4. 保存

- [ ] 模型创建成功
- [ ] 模型列表显示新模型
- [ ] 可以编辑模型
- [ ] 可以删除模型

### 3. 聊天功能测试
1. 进入"对话测试"
2. 选择模型
3. 输入测试消息
4. 发送

- [ ] 消息发送成功
- [ ] 收到模型响应（或合理的错误提示）
- [ ] 对话历史保存

### 4. 数据统计测试
1. 进入"使用监控"
2. 查看各项统计

- [ ] 总调用次数显示
- [ ] Token消耗显示
- [ ] 费用统计显示
- [ ] 趋势图表显示

## 🔐 安全检查

### 基础安全
- [ ] 默认密码已修改
- [ ] JWT_SECRET是强随机字符串
- [ ] .env文件权限设置正确
  ```bash
  chmod 600 .env
  ```

### 网络安全
- [ ] 生产环境启用HTTPS
- [ ] 防火墙规则配置
- [ ] 只开放必要端口

### 数据安全
- [ ] 数据库文件不在Git中
- [ ] 定期备份策略已配置
- [ ] 备份文件加密存储

## 📊 性能检查

### 资源使用
```bash
# 查看容器资源使用
docker stats llm-api-platform
```

- [ ] CPU使用率 < 50%
- [ ] 内存使用 < 500MB
- [ ] 磁盘I/O正常

### 响应时间
```bash
# 测试API响应时间
curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:8080/api/health
```

- [ ] 健康检查响应 < 100ms
- [ ] 登录接口响应 < 500ms
- [ ] 页面加载时间 < 2s

## 🗄️ 数据库检查

### 数据完整性
```bash
# 进入容器
docker exec -it llm-api-platform sh

# 检查数据库
sqlite3 /app/data/llm-platform.db

# 查看表
.tables

# 检查用户
SELECT * FROM users;

# 检查模型
SELECT * FROM models;

# 退出
.exit
```

- [ ] 所有表已创建
- [ ] 管理员账户存在
- [ ] 索引已创建

### 备份测试
```bash
# 执行备份
./deploy.sh
# 选择选项 7) 备份数据
```

- [ ] 备份文件生成
- [ ] 备份文件大小合理
- [ ] 可以恢复备份

## 📝 日志检查

### 应用日志
```bash
docker-compose logs -f
```

- [ ] 无ERROR级别日志
- [ ] 启动日志正常
- [ ] 请求日志记录

### 错误处理
- [ ] 无效token返回401
- [ ] 不存在资源返回404
- [ ] 服务器错误返回500
- [ ] 错误消息不包含敏感信息

## 🔄 重启测试

### 容器重启
```bash
# 重启容器
docker-compose restart

# 等待启动
sleep 5

# 检查状态
docker-compose ps
```

- [ ] 重启后服务正常
- [ ] 数据未丢失
- [ ] 可以重新登录

### 持久化测试
```bash
# 停止容器
docker-compose down

# 重新启动
docker-compose up -d

# 检查数据
curl http://localhost:8080/api/health
```

- [ ] 数据持久化成功
- [ ] 配置未丢失

## 🌐 浏览器兼容性测试

在不同浏览器中测试:
- [ ] Chrome / Edge
- [ ] Firefox
- [ ] Safari (Mac)

检查功能:
- [ ] 页面布局正常
- [ ] 交互功能正常
- [ ] 图表正常显示
- [ ] 响应式布局

## 📱 移动端测试（可选）

- [ ] 手机端可以访问
- [ ] 平板端布局正常
- [ ] 触摸操作流畅

## 🎯 最终验证清单

### 核心功能
- [ ] 用户可以登录
- [ ] 管理员可以管理模型
- [ ] 管理员可以管理用户
- [ ] 用户可以发送聊天消息
- [ ] 统计数据准确
- [ ] 配额限制生效

### 稳定性
- [ ] 服务持续运行24小时无崩溃
- [ ] 内存无泄漏
- [ ] 数据库无损坏

### 文档
- [ ] README.md已阅读
- [ ] 快速启动指南已跟随
- [ ] 知道如何查看日志
- [ ] 知道如何备份数据

## ✅ 部署完成确认

当以上所有检查项都通过后，恭喜您部署成功！

### 下一步建议

1. **配置真实的大模型API**
   - 添加您的OpenAI/百度/阿里等API密钥
   - 测试连接

2. **创建团队成员账户**
   - 为每个成员创建账户
   - 设置合适的配额

3. **配置监控告警**
   - 设置日志监控
   - 配置异常告警

4. **制定使用规范**
   - 编写API使用指南
   - 设定配额策略

5. **定期维护计划**
   - 每周检查日志
   - 每月更新依赖
   - 每季度安全审计

## 🆘 遇到问题？

### 常见问题快速解决

**问题**: 容器启动失败
```bash
# 查看日志
docker-compose logs

# 检查配置
docker-compose config
```

**问题**: 无法访问页面
```bash
# 检查端口
netstat -tlnp | grep 8080

# 检查防火墙
ufw status
```

**问题**: 数据库错误
```bash
# 删除数据卷重新开始
docker-compose down
docker volume rm llm-api-platform_llm-data
docker-compose up -d
```

**问题**: 忘记管理员密码
```bash
# 重置数据库
docker-compose down
docker volume rm llm-api-platform_llm-data
docker-compose up -d
# 使用默认密码 admin123456
```

---

**祝您使用愉快！** 🎉

如有其他问题，请查阅相关文档：
- [README.md](README.md) - 完整功能说明
- [DEVELOPMENT.md](DEVELOPMENT.md) - 开发指南
- [SECURITY.md](SECURITY.md) - 安全建议
