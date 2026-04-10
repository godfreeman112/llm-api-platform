# Docker 网络问题解决方案

## 问题描述
在部署时遇到以下错误：
```
failed to fetch oauth token: Post "https://auth.docker.io/token": 
dial tcp 45.114.11.25:443: connectex: A connection attempt failed
```

这是因为无法连接到 Docker Hub（国内网络限制）。

## 解决方案

### 方案1：配置 Docker 镜像加速器（推荐）

1. **打开 Docker Desktop**
   - 在系统托盘中找到 Docker 图标
   - 右键点击，选择 "Dashboard" 或直接打开 Docker Desktop

2. **进入设置**
   - 点击右上角的齿轮图标 ⚙️ (Settings)
   - 选择左侧菜单的 "Docker Engine"

3. **添加镜像加速器**
   
   在 JSON 配置中添加 `registry-mirrors` 字段：

   ```json
   {
     "builder": {
       "gc": {
         "defaultKeepStorage": "20GB",
         "enabled": true
       }
     },
     "experimental": false,
     "registry-mirrors": [
       "https://docker.m.daocloud.io",
       "https://huecker.io",
       "https://dockerhub.timeweb.cloud",
       "https://noohub.ru"
     ]
   }
   ```

4. **应用并重启**
   - 点击 "Apply & Restart" 按钮
   - 等待 Docker 重启完成

5. **重新部署**
   ```powershell
   .\deploy.bat
   ```
   选择选项 1 进行首次部署

### 方案2：手动拉取镜像

如果方案1仍然有问题，可以尝试手动拉取镜像：

```powershell
# 使用镜像加速器手动拉取
docker pull docker.m.daocloud.io/library/node:18-alpine

# 重新标记为官方名称
docker tag docker.m.daocloud.io/library/node:18-alpine node:18-alpine

# 然后重新部署
.\deploy.bat
```

### 方案3：使用代理

如果您有可用的代理：

1. 在 Docker Desktop 中设置代理：
   - Settings → Resources → Proxies
   - 配置您的代理服务器

2. 或者在系统环境变量中设置：
   ```powershell
   $env:HTTP_PROXY="http://your-proxy:port"
   $env:HTTPS_PROXY="http://your-proxy:port"
   ```

### 方案4：离线部署（高级）

如果以上方案都不可行，可以：

1. 在有网络的机器上导出镜像：
   ```bash
   docker save node:18-alpine -o node-18-alpine.tar
   ```

2. 传输到目标机器并导入：
   ```powershell
   docker load -i node-18-alpine.tar
   ```

3. 然后运行部署脚本

## 验证配置

配置完成后，测试是否可以拉取镜像：

```powershell
docker pull node:18-alpine
```

如果成功，再运行部署脚本：

```powershell
.\deploy.bat
```

## 常用镜像加速器列表

以下是一些常用的 Docker 镜像加速器：

- DaoCloud: `https://docker.m.daocloud.io`
- 腾讯云: `https://mirror.ccs.tencentyun.com`
- 阿里云: `https://<your-id>.mirror.aliyuncs.com` (需要注册)
- 网易: `https://hub-mirror.c.163.com`
- 中科大: `https://docker.mirrors.ustc.edu.cn`

## 其他注意事项

1. **确保 Docker Desktop 正在运行**
   - 检查系统托盘中的 Docker 图标
   - 图标应该是绿色且显示 "Docker Desktop is running"

2. **检查磁盘空间**
   ```powershell
   docker system df
   ```

3. **清理未使用的资源**
   ```powershell
   docker system prune -a
   ```

4. **查看 Docker 日志**
   - Docker Desktop → Troubleshoot → Get Support

## 联系支持

如果问题仍然存在，请提供：
- Docker Desktop 版本
- 操作系统版本
- 完整的错误日志

可以通过以下命令获取 Docker 信息：
```powershell
docker version
docker info
```
