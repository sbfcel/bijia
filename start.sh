#!/bin/bash
set -e

echo "=== 商品价格监控系统 ==="

echo "[1/2] 启动后端服务 (端口 3001)..."
cd /workspace/server && npx tsx src/index.ts &
SERVER_PID=$!

sleep 2

echo "[2/2] 启动前端服务 (端口 5173)..."
cd /workspace/client && npx vite --host 0.0.0.0 &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT

echo "前端: http://localhost:5173"
echo "后端: http://localhost:3001"

wait
