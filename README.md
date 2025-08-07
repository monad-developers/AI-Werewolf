# 🐺 AI 狼人杀游戏框架

一个基于 AI 的多人狼人杀游戏框架，采用 monorepo 架构，支持多个具有独特个性的 AI 玩家进行游戏。

## ✨ 特性

- 🤖 **AI 驱动**: 6 个具有不同个性和策略的 AI 玩家
- 🎮 **完整游戏流程**: 白天讨论投票、夜晚角色技能
- 🎭 **角色系统**: 支持村民、狼人、预言家、女巫四种角色
- 📊 **可视化界面**: React + MobX 实时状态管理
- 🔍 **AI 遥测**: 集成 Langfuse 进行 AI 行为分析
- 🚀 **高性能**: 使用 Bun 运行时，无需构建步骤

## 🛠 技术栈

- **运行时**: Bun
- **前端**: Vite + React + MobX + TailwindCSS
- **后端**: Express + TypeScript
- **AI**: OpenAI SDK + 自定义个性系统
- **监控**: Langfuse 遥测
- **架构**: Monorepo (Bun Workspaces)

## 📦 项目结构

```
AI-Werewolf/
├── packages/
│   ├── game-master-vite/   # 游戏主控前端
│   └── player/              # AI 玩家服务器
├── shared/
│   ├── types/               # 共享类型定义
│   ├── lib/                 # 共享工具库
│   └── prompts/             # AI 提示模板
├── config/                  # 玩家配置文件
└── scripts/                 # 启动脚本
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Bun 1.0+
- OpenAI API Key

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/AI-Werewolf.git
cd AI-Werewolf

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加你的 OpenAI API Key
```

### 启动游戏

```bash
# 启动所有 AI 玩家（端口 3001-3006）
bun run dev:players

# 新开终端，启动游戏主控界面（端口 3000）
bun run dev:game-master
```

访问 http://localhost:3000 开始游戏！

## 🎮 游戏流程

1. **创建游戏**: 点击"创建新游戏"按钮
2. **添加玩家**: 系统自动添加 6 个 AI 玩家
3. **分配角色**: 随机分配狼人、预言家、女巫和村民
4. **游戏循环**:
   - 🌞 白天: 玩家讨论并投票放逐
   - 🌙 夜晚: 特殊角色使用技能
5. **胜利条件**:
   - 村民阵营: 消灭所有狼人
   - 狼人阵营: 狼人数量 ≥ 村民数量

## 🤖 AI 玩家配置

每个 AI 玩家都有独特的个性设置：

| 端口 | 玩家 | 策略类型 | 说话风格 | 特点 |
|------|------|----------|----------|------|
| 3001 | 玩家1 | balanced | casual | 理性分析型 |
| 3002 | 玩家2 | aggressive | formal | 激进攻击型 |
| 3003 | 玩家3 | conservative | formal | 保守稳重型 |
| 3004 | 玩家4 | balanced | witty | 幽默风趣型 |
| 3005 | 玩家5 | balanced | formal | 逻辑推理型 |
| 3006 | 玩家6 | conservative | casual | 新手谨慎型 |

## 🔧 开发命令

### 开发模式

```bash
# 启动所有 AI 玩家
bun run dev:players

# 启动游戏主控
bun run dev:game-master

# 启动特定个性的玩家
bun run dev:player:aggressive
bun run dev:player:conservative
bun run dev:player:witty
```

### 代码质量

```bash
# 类型检查
bun run typecheck

# 代码规范检查
bun run lint

# 运行测试
bun test

# 测试覆盖率
bun run test:coverage
```

## 📊 监控与日志

### AI 玩家状态

每个 AI 玩家都提供状态接口：

- http://localhost:3001/api/player/status
- http://localhost:3002/api/player/status
- ... (3003-3006)

### 日志文件

开发模式日志保存在 `logs/` 目录：

- `player1-dev.log` - 玩家1日志
- `player2-dev.log` - 玩家2日志
- ... (player3-6)
- `game-master-dev.log` - 游戏主控日志

## 🎯 核心功能

### 角色系统

- **村民** 👤: 白天投票，无特殊技能
- **狼人** 🐺: 夜晚击杀，知道队友身份
- **预言家** 🔮: 每晚查验一名玩家身份
- **女巫** 🧪: 拥有解药和毒药各一瓶

### 游戏阶段

- **准备阶段**: 等待玩家加入
- **夜晚阶段**: 特殊角色行动
- **白天讨论**: AI 玩家自由发言
- **投票阶段**: 投票放逐可疑玩家
- **游戏结束**: 判定胜利条件

### AI 决策系统
- 个性化提示工程
- 上下文感知决策
- 策略性投票逻辑

## 等待完成功能
- [ ] 游戏结束时AI评分
- [ ] 遗言
- [ ] 狼队夜晚交流功能
- [ ] 添加守卫，猎人等角色
- [ ] 9人游戏模式
- [ ] 提升UI/UX
## 🤝 贡献

欢迎提交 Pull Request 或创建 Issue！