# LLM API Platform - 内网访问故障排查指南

## 问题症状
- ✅ localhost:8070 可以正常访问
- ❌ 172.16.6.181:8070（内网IP）无法访问

## 根本原因
Docker Desktop + WSL2 模式下，容器端口只在 Windows 本地有效。需要通过以下两个步骤才能让局域网其他设备访问：

1. **端口转发**：将 Windows IP 的流量转发到 WSL2 内部
2. **防火墙规则**：允许外部设备通过 Windows 防火墙访问

---

## 🔧 解决方案（需要管理员权限）

### 方法一：使用自动化脚本（推荐）

#### 步骤 1：以管理员身份运行 PowerShell

1. 按 `Win + X`
2. 选择 **"Windows Terminal (管理员)"** 或 **"PowerShell (管理员)"**

#### 步骤 2：执行配置脚本

```powershell
cd d:\web\llm-api-platform
.\setup-network.ps1
```

脚本会自动：
- ✓ 检测本机 IP 和 WSL2 IP
- ✓ 配置端口转发规则
- ✓ 添加防火墙入站规则
- ✓ 验证配置状态

#### 步骤 3：测试访问

从局域网内的另一台设备访问：**http://172.16.6.181:8070/**

---

### 方法二：手动配置（如果脚本失败）

在**管理员 PowerShell** 中依次执行：

```powershell
# 1. 获取本机 IP
$localIP = "172.16.6.181"  # 根据实际情况修改

# 2. 获取 WSL2 IP
$wslIp = (wsl ip addr show eth0 | Select-String "inet ").Line.Split(" ")[1].Split("/")[0]
Write-Host "WSL2 IP: $wslIp"

# 3. 删除旧规则（如果存在）
netsh interface portproxy delete v4tov4 listenaddress=$localIP listenport=8070
netsh advfirewall firewall delete rule name="LLM API Platform 8070"

# 4. 添加端口转发规则
netsh interface portproxy add v4tov4 listenaddress=$localIP listenport=8070 connectaddress=$wslIp connectport=8070

# 5. 添加防火墙入站规则
netsh advfirewall firewall add rule name="LLM API Platform 8070" dir=in action=allow protocol=TCP localport=8070 enable=yes profile=any

# 6. 验证配置
Write-Host "`n=== 端口转发规则 ==="
netsh interface portproxy show all

Write-Host "`n=== 防火墙规则 ==="
netsh advfirewall firewall show rule name="LLM API Platform 8070"
```

---

## 🔍 故障排查

### 检查点 1：确认 Docker 容器运行正常

```powershell
docker ps --filter "name=llm-api-platform"
```

应该看到容器状态为 `Up` 且端口映射为 `0.0.0.0:8070->8070/tcp`

### 检查点 2：确认本地访问正常

```powershell
curl http://localhost:8070/api/health
```

应该返回：`{"status":"ok",...}`

### 检查点 3：确认端口转发规则存在

```powershell
netsh interface portproxy show all
```

应该看到类似：
```
172.16.6.181    8070        172.23.xxx.xxx  8070
```

### 检查点 4：确认防火墙规则已启用

```powershell
netsh advfirewall firewall show rule name="LLM API Platform 8070"
```

应该显示 `已启用: 是`

### 检查点 5：临时关闭防火墙测试

**仅用于诊断，测试后务必重新开启！**

```powershell
# 临时关闭防火墙（管理员权限）
netsh advfirewall set allprofiles state off

# 测试访问后，立即重新开启
netsh advfirewall set allprofiles state on
```

如果关闭防火墙后可以访问，说明是防火墙规则配置问题。

---

## ⚠️ 常见问题

### Q1: WSL2 重启后 IP 变化怎么办？

WSL2 的 IP 地址在重启后可能会变化。解决方法：

1. 重新运行 `setup-network.ps1` 脚本
2. 或者手动更新端口转发规则中的 WSL2 IP

### Q2: 仍然无法访问？

尝试以下步骤：

1. **检查 Windows Defender 高级安全设置**
   - 打开 "Windows 安全中心" → "防火墙和网络保护"
   - 点击 "高级设置"
   - 检查是否有其他规则阻止了 8070 端口

2. **检查路由器/交换机设置**
   - 确保局域网设备在同一子网
   - 确认没有 VLAN 隔离

3. **使用 telnet 测试端口连通性**
   ```powershell
   # 在另一台设备上执行
   telnet 172.16.6.181 8070
   ```

### Q3: 如何永久解决这个问题？

创建一个开机自动配置脚本：

1. 创建文件 `C:\Scripts\setup-docker-network.ps1`
2. 内容参考 `setup-network.ps1`
3. 使用任务计划程序设置为开机自动运行（管理员权限）

---

## 📞 需要帮助？

如果以上方法都无法解决问题，请提供以下信息：

1. `docker ps` 的输出
2. `netsh interface portproxy show all` 的输出
3. `wsl ip addr show eth0` 的输出
4. 从另一台设备访问时的具体错误信息
