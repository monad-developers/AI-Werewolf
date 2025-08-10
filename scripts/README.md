# AI Werewolf Launch Scripts

## 📁 File Description

- `start-players.sh` - Linux/Mac production mode startup script
- `start-players.bat` - Windows production mode startup script  
- `dev-players.sh` - Linux/Mac development mode startup script

## 🚀 Usage

### Method 1: Using npm scripts (Recommended)

```bash
# Start all 6 AI players in development mode
pnpm dev:all-players

# Start all 6 AI players in production mode (build required first)
pnpm build
pnpm start:all-players

# Start both game master process and all AI players simultaneously
pnpm dev:game
```

### Method 2: Run scripts directly

```bash
# Linux/Mac - Development mode
./scripts/dev-players.sh

# Linux/Mac - Production mode  
./scripts/start-players.sh

# Windows - Production mode
scripts\start-players.bat
```

## 🎮 AI Player Configuration

Each AI player has unique personality and configuration:

| Port | Player Name | Personality | Strategy | Speaking Style | AI Model |
|------|-------------|-------------|----------|----------------|----------|
| 3001 | Smart Analyst | Rational analytical type, good at logical reasoning | balanced | casual | claude-3-haiku |
| 3002 | Wolf King | Aggressive type, dares to question and attack | aggressive | formal | gpt-4 |
| 3003 | Guardian | Conservative and steady, observes and thinks | conservative | formal | claude-3.5-sonnet |
| 3004 | Humor Master | Witty and humorous, good at defusing tension | balanced | witty | gpt-3.5-turbo |
| 3005 | Detective | Strong logical reasoning, focuses on fact analysis | balanced | formal | claude-3-haiku |
| 3006 | Newbie Villager | Newbie type, easily misled | conservative | casual | gpt-3.5-turbo |

## 📋 Status Monitoring

After startup, you can check each AI player's status at:

- Smart Analyst: http://localhost:3001/api/player/status
- Wolf King: http://localhost:3002/api/player/status
- Guardian: http://localhost:3003/api/player/status
- Humor Master: http://localhost:3004/api/player/status
- Detective: http://localhost:3005/api/player/status
- Newbie Villager: http://localhost:3006/api/player/status

## 📝 Log Files

All log files are saved in the `logs/` directory:

- `player1.log` - Smart Analyst logs
- `player2.log` - Wolf King logs
- `player3.log` - Guardian logs
- `player4.log` - Humor Master logs
- `player5.log` - Detective logs
- `player6.log` - Newbie Villager logs

Development mode log files have the suffix `-dev.log`

## 🛑 Stop AI Players

### Linux/Mac
Press `Ctrl+C` to stop the script, which will automatically clean up all started processes

### Windows
Close the command line window, or manually close each AI player's cmd window

## ⚙️ Configuration Files

All configuration files are located in the `config/` directory:

- `player1.json` - Smart Analyst configuration
- `player2.json` - Wolf King configuration
- `player3.json` - Guardian configuration
- `player4.json` - Humor Master configuration
- `player5.json` - Detective configuration
- `player6.json` - Newbie Villager configuration

You can modify these configuration files to adjust the AI players' behavioral characteristics.

## 🔧 Troubleshooting

### Port Already in Use
If a port is already in use, modify the port number in the corresponding configuration file.

### AI API Failure
- Check API key settings in environment variables
- AI service will automatically downgrade to preset replies, which won't affect game progress

### Process Startup Failure
- Check the corresponding log file for detailed error information
- Ensure dependencies are properly installed: `pnpm install`
- Production mode requires building first: `pnpm build`

## 🎯 Test Example

After startup, you can test the AI player's speaking function:

```bash
# Test Smart Analyst speech
curl -X POST http://localhost:3001/api/player/speak \
  -H "Content-Type: application/json" \
  -d '{
    "otherSpeeches": ["player2: I think player3 is suspicious"],
    "allSpeeches": ["player1: Hello everyone", "player2: I think player3 is suspicious"]
  }'
```

Each AI player will generate different styles of responses based on their personality traits.