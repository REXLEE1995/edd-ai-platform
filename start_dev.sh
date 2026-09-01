#!/bin/bash
# ========================================================
# EDD AI Platform 本地一键启动脚本 (macOS / Linux)
# 包含 MinIO 对象存储、FastAPI 后端与 Vite 前端
# ========================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================"
echo "  EDD AI Platform - 企业尽调系统 (本地全栈一键启动)"
echo "========================================================"
echo ""

# 1. 创建 MinIO 数据存储目录
mkdir -p "$DIR/backend/data/minio_data"

# 2. 检查并启动 MinIO 服务
if ! lsof -i :9000 >/dev/null 2>&1; then
    echo "[1/3] 正在启动 MinIO 对象存储 (http://127.0.0.1:9000, 控制台: http://127.0.0.1:9001)..."
    MINIO_ROOT_USER=admin MINIO_ROOT_PASSWORD=admin123456 /opt/homebrew/bin/minio server \
        --address 127.0.0.1:9000 \
        --console-address 127.0.0.1:9001 \
        "$DIR/backend/data/minio_data" > "$DIR/backend/data/minio.log" 2>&1 &
    sleep 1
    echo "      MinIO 启动成功 (PID: $!)"
else
    echo "[1/3] MinIO 服务已在 9000 端口运行。"
fi

# 3. 启动 FastAPI 后端服务
if ! lsof -i :8000 >/dev/null 2>&1; then
    echo "[2/3] 正在启动 FastAPI 后端服务 (http://127.0.0.1:8000)..."
    cd "$DIR/backend"
    ./.venv/bin/python main.py > "$DIR/backend/data/backend.log" 2>&1 &
    echo "      后端服务启动成功 (PID: $!)"
    cd "$DIR"
else
    echo "[2/3] 后端服务已在 8000 端口运行。"
fi

# 4. 启动 Vite 前端服务
if ! lsof -i :5173 >/dev/null 2>&1; then
    echo "[3/3] 正在启动 Vite 前端服务 (http://localhost:5173)..."
    cd "$DIR/frontend"
    npm run dev &
    cd "$DIR"
else
    echo "[3/3] 前端服务已在 5173 端口运行。"
fi

echo ""
echo "========================================================"
echo "  所有服务已全部就绪！"
echo "  - SaaS 尽调工作台:     http://localhost:5173"
echo "  - 运营管理后台 (Admin): http://localhost:5173/admin"
echo "  - 后端 API 文档:        http://127.0.0.1:8000/docs"
echo "  - MinIO 控制台:         http://127.0.0.1:9001 (账号: admin / 密码: admin123456)"
echo "========================================================"
