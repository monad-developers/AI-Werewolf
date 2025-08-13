import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export interface PlayerConfig {
  server: {
    port: number;
    host: string;
  };
  ai: {
    model: string;
    maxTokens: number;
    temperature: number;
    provider: 'openrouter' | 'openai';
    apiKey?: string;
  };
  game: {
    personality: string;
    strategy: 'aggressive' | 'conservative' | 'balanced';
  };
  logging: {
    enabled: boolean;
  };
}

export const DEFAULT_CONFIG: PlayerConfig = {
  server: {
    port: 3001,
    host: '0.0.0.0'
  },
  ai: {
    model: 'gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.8,
    provider: 'openai'
  },
  game: {
    personality: '理性分析型玩家，善于逻辑推理',
    strategy: 'balanced'
  },
  logging: {
    enabled: true
  }
};

export class ConfigLoader {
  private config: PlayerConfig;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): PlayerConfig {
    // 加载默认配置
    let config = { ...DEFAULT_CONFIG };

    // 从环境变量覆盖配置
    this.loadFromEnv(config);

    // 从配置文件覆盖配置
    if (configPath) {
      try {
        const fileConfig = this.loadFromFile(configPath);
        config = this.mergeConfig(config, fileConfig);
        console.log(`✅ 配置文件已加载: ${configPath}`);
      } catch (error) {
        console.warn(`⚠️ 无法加载配置文件 ${configPath}:`, error);
        console.log('使用默认配置和环境变量配置');
      }
    }

    return config;
  }

  private loadFromFile(configPath: string): Partial<PlayerConfig> {
    const absolutePath = join(process.cwd(), configPath);
    const configContent = readFileSync(absolutePath, 'utf-8');
    
    if (configPath.endsWith('.json')) {
      return JSON.parse(configContent);
    } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      return yaml.load(configContent) as Partial<PlayerConfig>;
    } else if (configPath.endsWith('.js') || configPath.endsWith('.ts')) {
      // 对于JS/TS文件，我们需要动态导入
      delete require.cache[require.resolve(absolutePath)];
      const configModule = require(absolutePath);
      return configModule.default || configModule;
    } else {
      throw new Error('不支持的配置文件格式，请使用 .json、.yaml、.yml、.js 或 .ts 文件');
    }
  }

  private loadFromEnv(config: PlayerConfig): void {
    // 服务器配置
    if (process.env.PORT) {
      config.server.port = parseInt(process.env.PORT);
    }
    if (process.env.HOST) {
      config.server.host = process.env.HOST;
    }

    // AI配置
    if (process.env.AI_MODEL) {
      config.ai.model = process.env.AI_MODEL;
    }
    if (process.env.AI_MAX_TOKENS) {
      config.ai.maxTokens = parseInt(process.env.AI_MAX_TOKENS);
    }
    if (process.env.AI_TEMPERATURE) {
      config.ai.temperature = parseFloat(process.env.AI_TEMPERATURE);
    }
    if (process.env.OPENROUTER_API_KEY) {
      config.ai.provider = 'openrouter';
      config.ai.apiKey = process.env.OPENROUTER_API_KEY;
    } else if (process.env.OPENAI_API_KEY) {
      config.ai.provider = 'openai';
      config.ai.apiKey = process.env.OPENAI_API_KEY;
    }

    // 游戏配置
    if (process.env.PLAYER_PERSONALITY) {
      config.game.personality = process.env.PLAYER_PERSONALITY;
    }
    if (process.env.PLAYER_STRATEGY) {
      config.game.strategy = process.env.PLAYER_STRATEGY as any;
    }

    // 日志配置
    if (process.env.LOG_ENABLED) {
      config.logging.enabled = process.env.LOG_ENABLED === 'true';
    }
  }

  private mergeConfig(base: PlayerConfig, override: Partial<PlayerConfig>): PlayerConfig {
    return {
      server: { ...base.server, ...override.server },
      ai: { ...base.ai, ...override.ai },
      game: { ...base.game, ...override.game },
      logging: { ...base.logging, ...override.logging }
    };
  }

  getConfig(): PlayerConfig {
    return this.config;
  }

  // 验证配置
  validateConfig(): boolean {
    const { config } = this;
    
    // 验证端口
    if (config.server.port < 1 || config.server.port > 65535) {
      console.error('❌ 无效的端口号:', config.server.port);
      return false;
    }

    // 验证AI配置
    if (!config.ai.apiKey && process.env.NODE_ENV !== 'test') {
      console.warn('⚠️ 未配置AI API密钥，将使用预设回复');
    }

    if (config.ai.maxTokens < 10 || config.ai.maxTokens > 10000) {
      console.error('❌ maxTokens应在10-2000之间:', config.ai.maxTokens);
      return false;
    }

    if (config.ai.temperature < 0 || config.ai.temperature > 2) {
      console.error('❌ temperature应在0-2之间:', config.ai.temperature);
      return false;
    }

    return true;
  }

  // 打印配置信息
  printConfig(): void {
    if (!this.config.logging.enabled) return;
    
    console.log('\n🎯 Player配置信息:');
    console.log(`  服务器: ${this.config.server.host}:${this.config.server.port}`);
    console.log(`  AI模型: ${this.config.ai.model} (${this.config.ai.provider})`);
    console.log(`  策略: ${this.config.game.strategy}`);
    console.log(`  日志: ${this.config.logging.enabled ? '启用' : '禁用'}\n`);
  }
}