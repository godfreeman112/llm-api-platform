# 生产环境部署安全检查清单

## 部署前检查

### 1. 安全配置

- [ ] **修改JWT密钥**
  ```bash
  # 生成强随机密钥
  openssl rand -base64 32
  ```
  将生成的密钥填入 `.env` 文件的 `JWT_SECRET`

- [ ] **修改管理员默认密码**
  ```env
  ADMIN_PASSWORD=your-strong-password-here
  ```

- [ ] **设置环境变量权限**
  ```bash
  chmod 600 .env
  ```

### 2. HTTPS配置

- [ ] 获取SSL证书（Let's Encrypt免费证书或购买商业证书）
- [ ] 配置Nginx反向代理（参考 `nginx.conf`）
- [ ] 强制HTTPS重定向
- [ ] 配置HSTS头

### 3. 网络安全

- [ ] **防火墙配置**
  ```bash
  # 只开放必要端口
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw enable
  ```

- [ ] **限制访问IP** (如果是内网系统)
  ```nginx
  # Nginx配置
  allow 192.168.1.0/24;  # 内网网段
  deny all;
  ```

- [ ] **启用速率限制**
  ```nginx
  # Nginx限流
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  ```

### 4. 数据库安全

- [ ] **定期备份**
  ```bash
  # 添加到crontab，每天凌晨2点备份
  0 2 * * * /path/to/backup.sh
  ```

- [ ] **备份脚本示例**
  ```bash
  #!/bin/bash
  BACKUP_DIR="/backup/llm-platform/$(date +%Y%m%d)"
  mkdir -p "$BACKUP_DIR"
  docker run --rm \
    -v llm-api-platform_llm-data:/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf /backup/data.tar.gz -C /data .
  # 保留最近7天的备份
  find /backup/llm-platform -type d -mtime +7 -exec rm -rf {} \;
  ```

### 5. 日志监控

- [ ] **启用访问日志**
  ```nginx
  access_log /var/log/nginx/llm-platform-access.log;
  error_log /var/log/nginx/llm-platform-error.log warn;
  ```

- [ ] **配置日志轮转**
  ```bash
  # /etc/logrotate.d/llm-platform
  /var/log/nginx/llm-platform-*.log {
      daily
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 www-data adm
      sharedscripts
      postrotate
          systemctl reload nginx
      endscript
  }
  ```

### 6. 容器安全

- [ ] **使用非root用户运行容器**
  ```dockerfile
  # Dockerfile中添加
  RUN addgroup -S appgroup && adduser -S appuser -G appgroup
  USER appuser
  ```

- [ ] **限制容器资源**
  ```yaml
  # docker-compose.yml
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        memory: 512M
  ```

- [ ] **定期更新镜像**
  ```bash
  docker-compose pull
  docker-compose up -d
  ```

### 7. 应用安全

- [ ] **启用CORS白名单**
  ```javascript
  // backend/server.js
  app.use(cors({
    origin: ['https://your-domain.com'],
    credentials: true
  }));
  ```

- [ ] **配置内容安全策略**
  ```nginx
  add_header Content-Security-Policy "default-src 'self';" always;
  ```

- [ ] **隐藏服务器信息**
  ```nginx
  server_tokens off;
  more_clear_headers Server;
  ```

### 8. 监控告警

- [ ] **健康检查**
  ```yaml
  # docker-compose.yml
  healthcheck:
    test: ["CMD", "wget", "--spider", "http://localhost:8080/api/health"]
    interval: 30s
    timeout: 3s
    retries: 3
  ```

- [ ] **配置告警** (可选)
  - 使用Prometheus + Grafana监控
  - 配置钉钉/企业微信告警

## 部署后验证

### 安全检查清单

```bash
# 1. 检查服务状态
docker-compose ps

# 2. 检查日志是否有错误
docker-compose logs | grep -i error

# 3. 测试健康检查端点
curl https://your-domain.com/api/health

# 4. 测试HTTPS
curl -I https://your-domain.com

# 5. 检查SSL证书
openssl s_client -connect your-domain.com:443

# 6. 测试登录功能
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

### 性能测试

```bash
# 使用ab进行简单的压力测试
ab -n 1000 -c 10 https://your-domain.com/api/health

# 或使用wrk
wrk -t12 -c400 -d30s https://your-domain.com/api/health
```

## 应急响应

### 发现安全漏洞时

1. **立即行动**
   - 更改所有用户密码
   - 轮换JWT密钥
   - 检查日志确认影响范围

2. **修复漏洞**
   - 更新相关依赖
   - 修补代码漏洞
   - 重新部署

3. **事后分析**
   - 记录事件时间线
   - 分析根本原因
   - 制定预防措施

### 数据泄露处理

1. 立即下线服务
2. 评估泄露范围
3. 通知受影响用户
4. 报告相关部门
5. 加强安全措施

## 定期维护

### 每周任务
- [ ] 检查错误日志
- [ ] 监控资源使用情况
- [ ] 检查磁盘空间

### 每月任务
- [ ] 更新系统和依赖包
- [ ] 审查用户账户
- [ ] 测试备份恢复
- [ ] 安全扫描

### 每季度任务
- [ ] 全面安全审计
- [ ] 性能优化
- [ ] 灾难恢复演练
- [ ] 更新文档

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker安全最佳实践](https://docs.docker.com/engine/security/)
- [Nginx安全配置](https://www.nginx.com/blog/securing-traffic-between-nginxs/)
- [Node.js安全指南](https://nodejs.org/en/docs/guides/security/)
