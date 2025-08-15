#!/bin/bash

# AI狼人杀 - 开发模式AI玩家启动脚本
# 启动8个AI玩家进程

echo "🤖 AI狼人杀玩家启动（开发模式）"
echo "=============================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 创建日志目录
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

# 存储进程ID
declare -a PIDS=()

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在停止所有AI玩家进程..."
    
    # 停止所有AI玩家
    for pid in "${PIDS[@]}"; do
        if kill -0 $pid 2>/dev/null; then
            echo "   停止AI玩家进程 (PID: $pid)"
            kill $pid
        fi
    done
    
    echo "✅ 所有AI玩家进程已停止"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 加载环境变量
if [ -f ".env" ]; then
    echo "📋 加载环境变量..."
    export $(grep -v '^#' .env | xargs)
fi

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装monorepo依赖..."
    bun install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 启动AI玩家
echo "🤖 启动AI玩家（开发模式）..."

# 定义玩家配置
declare -a PLAYERS=(
    "player1:玩家1:3001"
    "player2:玩家2:3002" 
    "player3:玩家3:3003"
    "player4:玩家4:3004"
    "player5:玩家5:3005"
    "player6:玩家6:3006"
    "player7:玩家7:3007"
    "player8:玩家8:3008"
)

# 启动每个玩家
for player_info in "${PLAYERS[@]}"; do
    IFS=':' read -r config_name player_name port <<< "$player_info"
    config_file="config/${config_name}.yaml"
    log_file="$LOG_DIR/${config_name}-dev.log"
    
    echo "   启动 $player_name (端口: $port)"
    
    cd packages/player
    bun run dev --config="../../$config_file" > "../../$log_file" 2>&1 &
    pid=$!
    cd ../..
    
    PIDS+=($pid)
    echo "     PID: $pid"
    
    # 检查进程是否启动成功
    if ! kill -0 $pid 2>/dev/null; then
        echo "❌ $player_name 启动失败，请检查日志: $log_file"
        cleanup
    fi
done

echo ""
echo "✅ 所有AI玩家启动成功！（开发模式）"
echo ""
echo "🎮 AI玩家状态:"
echo "   玩家1: http://localhost:3001/api/player/status"
echo "   玩家2: http://localhost:3002/api/player/status"
echo "   玩家3: http://localhost:3003/api/player/status"
echo "   玩家4: http://localhost:3004/api/player/status"
echo "   玩家5: http://localhost:3005/api/player/status"
echo "   玩家6: http://localhost:3006/api/player/status"
echo "   玩家7: http://localhost:3007/api/player/status"
echo "   玩家8: http://localhost:3008/api/player/status"
echo ""
echo "📋 日志文件: $LOG_DIR/ (后缀 -dev.log)"
echo ""
echo "💡 提示:"
echo "   请确保游戏主进程已启动：bun run dev:game-master"
echo "   或使用 bun run dev:game 同时启动游戏主进程和AI玩家"
echo ""
echo "🛑 按 Ctrl+C 停止所有AI玩家服务"
echo ""

# 监控进程状态
while true; do
    sleep 5
    
    # 静默检查AI玩家进程
    alive_count=0
    for pid in "${PIDS[@]}"; do
        if kill -0 $pid 2>/dev/null; then
            ((alive_count++))
        fi
    done
    
    # 如果AI玩家都退出了，提示并退出
    if [ $alive_count -eq 0 ]; then
        echo "⚠️  所有AI玩家都已退出"
        cleanup
    fi
done