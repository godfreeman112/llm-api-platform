#!/bin/bash

# 企业大模型API平台 - Docker部署脚本

set -e

echo "======================================"
echo "  企业大模型API平台 - Docker部署"
echo "======================================"
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 确定使用的docker-compose命令
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# 检查.env文件
if [ ! -f .env ]; then
    echo "警告: .env文件不存在，将使用默认配置"
    echo "建议复制.env.example为.env并修改配置"
    cp .env.example .env
fi

# 读取用户输入
echo "请选择操作:"
echo "1) 首次部署"
echo "2) 重新构建并部署"
echo "3) 启动已部署的服务"
echo "4) 停止服务"
echo "5) 查看服务状态"
echo "6) 查看日志"
echo "7) 备份数据"
read -p "请输入选项 (1-7): " choice

case $choice in
    1)
        echo ""
        echo "开始首次部署..."
        $DOCKER_COMPOSE up -d --build
        echo ""
        echo "✓ 部署完成！"
        echo "访问地址: http://localhost:8080"
        echo "默认管理员账号: admin / admin123456"
        ;;
    2)
        echo ""
        echo "开始重新构建并部署..."
        $DOCKER_COMPOSE down
        $DOCKER_COMPOSE build --no-cache
        $DOCKER_COMPOSE up -d
        echo ""
        echo "✓ 重新部署完成！"
        ;;
    3)
        echo ""
        echo "启动服务..."
        $DOCKER_COMPOSE up -d
        echo "✓ 服务已启动"
        ;;
    4)
        echo ""
        echo "停止服务..."
        $DOCKER_COMPOSE down
        echo "✓ 服务已停止"
        ;;
    5)
        echo ""
        echo "服务状态:"
        $DOCKER_COMPOSE ps
        ;;
    6)
        echo ""
        echo "查看日志 (Ctrl+C退出):"
        $DOCKER_COMPOSE logs -f
        ;;
    7)
        echo ""
        echo "备份数据..."
        BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        docker run --rm \
            -v llm-api-platform_llm-data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf /backup/data.tar.gz -C /data .
        echo "✓ 数据已备份到: $BACKUP_DIR"
        ;;
    *)
        echo "无效的选项"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "  常用命令提示"
echo "======================================"
echo "查看日志: $DOCKER_COMPOSE logs -f"
echo "重启服务: $DOCKER_COMPOSE restart"
echo "停止服务: $DOCKER_COMPOSE down"
echo "更新服务: $DOCKER_COMPOSE pull && $DOCKER_COMPOSE up -d"
echo "======================================"
