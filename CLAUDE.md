# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AI-powered Werewolf game framework - a monorepo implementing an AI-driven multiplayer werewolf game with distinct AI personalities.

## Tech Stack & Package Manager
- **Package Manager**: Bun (no build step needed for backend, direct execution)
- **Frontend**: Vite + React + MobX + TailwindCSS
- **Backend**: Node.js/Bun + Express
- **AI Integration**: OpenAI SDK, Langfuse telemetry
- **State Management**: MobX with global stores
- 我用bun，不需要build

## Critical Development Rules
- **TypeScript**: NEVER use `any` type - always use proper typing
- **Always use ultrathink** for complex reasoning tasks
- **Player IDs**: Always use numbers for Player IDs
- **Shared Types**: Only put types in shared/ if needed by Player services (e.g., API types called by game master)

## Common Development Commands

### Development
```bash
# Start all 6 AI players (ports 3001-3006)
./scripts/dev-players.sh
# OR
bun run dev:players

# Start game master frontend (port 3000)
bun run dev:game-master

# Start individual player with config
bun run dev:player:aggressive
bun run dev:player:conservative
bun run dev:player:witty
bun run dev:player:default
```

### Code Quality
```bash
# Type checking (entire monorepo)
bun run typecheck
bunx tsc --build

# Type checking specific packages
bun run typecheck:frontend
bun run typecheck:backend

# Linting
bun run lint

# Testing (when tests exist)
bun test
bun run test:packages
bun run test:coverage
```

## Architecture Overview

### Monorepo Structure
```
packages/
├── game-master-vite/   # Frontend UI (Vite + React + MobX)
│   └── src/
│       ├── components/ # React components with observer HOC
│       ├── stores/     # MobX global stores
│       └── lib/        # GameMaster class
├── player/             # AI player server
│   └── src/
│       ├── services/   # AIService, PersonalityFactory
│       └── configs/    # Player personality configs
shared/
├── types/              # Shared TypeScript types & schemas
│   └── src/
│       ├── api.ts      # API request/response types
│       └── schemas.ts  # Zod schemas for AI responses
├── lib/                # Shared utilities & Langfuse integration
└── prompts/            # AI prompt templates
```

### Core Game Flow
1. **Game Creation**: Frontend calls `gameMaster.createGame(6)` → adds 6 AI players → assigns roles
2. **Game Phases**: Day (discussion + voting) → Night (role abilities) → repeat
3. **AI Players**: Each runs on separate port (3001-3006), receives game state via HTTP API
4. **Role System**: 4 roles only - VILLAGER, WEREWOLF, SEER, WITCH (no HUNTER/GUARD)

## MobX React Development Pattern

### Required Pattern
```typescript
// ✅ ALWAYS use this pattern
import { observer } from 'mobx-react-lite';
import { gameMaster } from '@/stores/gameStore';

export const Component = observer(function Component() {
  const data = gameMaster.computedProperty; // Direct global state access
  return <div>{data}</div>;
});
```

### Core MobX Rules
1. **Global State First**: Access state directly from global stores, never pass through props
2. **Observer Wrapper**: ALL components using MobX state MUST use `observer` HOC
3. **Computed Properties**: Use `computed` for derived data to optimize performance
4. **Avoid Redundant APIs**: Get data directly from state, don't make unnecessary network requests

## Critical Integration Points

### Langfuse Telemetry
- Located in `shared/lib/src/langfuse.ts`
- Key exports: `getAITelemetryConfig`, `shutdownLangfuse`, `langfuse` object
- Browser-safe implementation (no-op flush in frontend)

### AI Service Architecture
- `AIService` class handles all AI interactions
- Personality system via `PersonalityFactory`
- Each player has configurable personality affecting decisions
- Zod schemas validate AI responses (see `shared/types/src/schemas.ts`)

### Game State Management
- Frontend: Global `GameMaster` instance in `packages/game-master-vite/src/stores/gameStore.ts`
- Players maintain local state, receive updates via API
- State sync through HTTP endpoints, no WebSocket

## Player Configuration
AI players run on ports 3001-3006 with personalities defined in YAML configs:
- **Port 3001-3006**: Individual AI players with unique personalities
- Config files: `config/player[1-6].yaml`
- Each player has strategy (aggressive/conservative/balanced), speech style (casual/formal/witty)

## UI Components
- **Game Controls**: Blue create, green start, purple next phase, red end buttons
- **Player Cards**: Show role icons (🐺🔮🧪👤), alive/dead status
- **Auto-setup**: "Create New Game" button automatically configures 6 AI players

## Known Issues & Fixes
- **Langfuse Integration**: `getAITelemetryConfig` must be exported from `shared/lib/src/langfuse.ts`
- **Create Game**: Must add players and assign roles after game creation
- **Type Imports**: Always import `PersonalityType` when using AI services