# LLM API Platform - 内网访问配置脚本
# 需要以管理员身份运行

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LLM API Platform 内网访问配置工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误: 此脚本需要管理员权限！" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell，选择'以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

# 获取本机 IP
Write-Host "正在检测本机 IP..." -ForegroundColor Yellow
$ipconfigOutput = ipconfig | Out-String
$ipMatches = [regex]::Matches($ipconfigOutput, 'IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)')
$localIP = $null

foreach ($match in $ipMatches) {
    $ip = $match.Groups[1].Value
    # 选择 172.16.x.x 或 192.168.x.x 或 10.x.x.x 的 IP，排除 WSL2 的 172.17-31.x.x
    if ($ip -match '^(172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.|192\.168\.|10\.)') {
        $localIP = $ip
        break
    }
}

if (-not $localIP) {
    # 如果没有找到，使用第一个非回环 IP
    foreach ($match in $ipMatches) {
        $ip = $match.Groups[1].Value
        if ($ip -ne '127.0.0.1') {
            $localIP = $ip
            break
        }
    }
}

if (-not $localIP) {
    Write-Host "错误: 无法自动检测本机 IP，请手动指定" -ForegroundColor Red
    exit 1
}

Write-Host "检测到本机 IP: $localIP" -ForegroundColor Green

# 获取 WSL2 IP
Write-Host "`n正在获取 WSL2 IP..." -ForegroundColor Yellow
try {
    $wslOutput = wsl ip addr show eth0 2>$null | Out-String
    $wslMatch = [regex]::Match($wslOutput, 'inet\s+(\d+\.\d+\.\d+\.\d+)')
    if ($wslMatch.Success) {
        $wslIp = $wslMatch.Groups[1].Value
        Write-Host "WSL2 IP: $wslIp" -ForegroundColor Green
    } else {
        Write-Host "错误: 无法解析 WSL2 IP" -ForegroundColor Red
        Write-Host "原始输出: $wslOutput" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "错误: 无法获取 WSL2 IP，请确保 Docker Desktop 正在运行" -ForegroundColor Red
    Write-Host "错误详情: $_" -ForegroundColor Yellow
    exit 1
}

# 删除旧的端口转发规则
Write-Host "`n清理旧的端口转发规则..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenaddress=$localIP listenport=8070 2>$null

# 添加新的端口转发规则
Write-Host "添加端口转发规则: $localIP:8070 -> $wslIp:8070" -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenaddress=$localIP listenport=8070 connectaddress=$wslIp connectport=8070
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 端口转发规则添加成功" -ForegroundColor Green
} else {
    Write-Host "✗ 端口转发规则添加失败" -ForegroundColor Red
    exit 1
}

# 删除旧的防火墙规则
Write-Host "`n清理旧的防火墙规则..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="LLM API Platform 8070" 2>$null

# 添加防火墙入站规则
Write-Host "添加防火墙入站规则（TCP 8070）..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="LLM API Platform 8070" dir=in action=allow protocol=TCP localport=8070 enable=yes profile=any
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 防火墙规则添加成功" -ForegroundColor Green
} else {
    Write-Host "✗ 防火墙规则添加失败" -ForegroundColor Red
    exit 1
}

# 验证配置
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "配置验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n端口转发规则:" -ForegroundColor Yellow
netsh interface portproxy show all | Select-String "$localIP"

Write-Host "`n防火墙规则状态:" -ForegroundColor Yellow
$firewallRules = netsh advfirewall firewall show rule name=all 2>$null | Out-String
if ($firewallRules -match "8070") {
    Write-Host "✓ 检测到 8070 端口的防火墙规则" -ForegroundColor Green
} else {
    Write-Host "✗ 未检测到 8070 端口的防火墙规则" -ForegroundColor Red
    Write-Host "  提示: 请以管理员身份运行此脚本" -ForegroundColor Yellow
}

Write-Host "`nDocker 容器状态:" -ForegroundColor Yellow
docker ps --filter "name=llm-api-platform" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n本地访问测试:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8070/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ 本地访问正常" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ 本地访问失败: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  本地访问: http://localhost:8070/" -ForegroundColor White
Write-Host "  内网访问: http://$($localIP):8070/" -ForegroundColor White
Write-Host ""
Write-Host "提示: 如果 WSL2 重启后 IP 变化，请重新运行此脚本" -ForegroundColor Yellow
Write-Host ""
