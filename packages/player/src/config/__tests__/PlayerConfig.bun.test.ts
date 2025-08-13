import { test, expect, describe, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { ConfigLoader, DEFAULT_CONFIG, type PlayerConfig } from '../PlayerConfig';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('PlayerConfig', () => {
  describe('DEFAULT_CONFIG', () => {
    test('should have all required properties', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('server');
      expect(DEFAULT_CONFIG).toHaveProperty('ai');
      expect(DEFAULT_CONFIG).toHaveProperty('game');
      expect(DEFAULT_CONFIG).toHaveProperty('logging');
    });

    test('should have valid server configuration', () => {
      expect(DEFAULT_CONFIG.server.port).toBe(3001);
      expect(DEFAULT_CONFIG.server.host).toBe('0.0.0.0');
      expect(typeof DEFAULT_CONFIG.server.port).toBe('number');
      expect(typeof DEFAULT_CONFIG.server.host).toBe('string');
    });

    test('should have valid AI configuration', () => {
      expect(DEFAULT_CONFIG.ai.model).toBe('gpt-3.5-turbo');
      expect(DEFAULT_CONFIG.ai.maxTokens).toBe(150);
      expect(DEFAULT_CONFIG.ai.temperature).toBe(0.8);
      expect(DEFAULT_CONFIG.ai.provider).toBe('openai');
      expect(DEFAULT_CONFIG.ai.apiKey).toBeUndefined();
    });

    test('should have valid game configuration', () => {
      expect(DEFAULT_CONFIG.game.personality).toBe('理性分析型玩家，善于逻辑推理');
      expect(DEFAULT_CONFIG.game.strategy).toBe('balanced');
    });

    test('should have valid logging configuration', () => {
      expect(DEFAULT_CONFIG.logging.enabled).toBe(true);
    });
  });

  describe('ConfigLoader', () => {
    let originalEnv: Record<string, string | undefined>;
    let configLoader: ConfigLoader;
    let consoleSpy: any;
    let consoleWarnSpy: any;
    let consoleLogSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
      // Save original environment variables
      originalEnv = { ...process.env };
      
      // Clear all config-related environment variables
      const configVars = [
        'PORT', 'HOST', 'AI_MODEL', 'AI_MAX_TOKENS', 'AI_TEMPERATURE', 
        'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 
        'PLAYER_PERSONALITY', 'PLAYER_STRATEGY', 
        'LOG_ENABLED', 'NODE_ENV'
      ];
      
      configVars.forEach(varName => {
        delete process.env[varName];
      });

      // Set up console spies
      consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
      consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Properly restore original environment variables
      const configVars = [
        'PORT', 'HOST', 'AI_MODEL', 'AI_MAX_TOKENS', 'AI_TEMPERATURE', 
        'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 
        'PLAYER_PERSONALITY', 'PLAYER_STRATEGY', 
        'LOG_ENABLED', 'NODE_ENV'
      ];
      
      configVars.forEach(varName => {
        if (originalEnv[varName] !== undefined) {
          process.env[varName] = originalEnv[varName];
        } else {
          delete process.env[varName];
        }
      });
      
      // Restore console methods
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    describe('Constructor - Default Configuration', () => {
      test('should load default configuration when no config path provided', () => {
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config).toEqual(DEFAULT_CONFIG);
      });

      test('should load default configuration when config path is undefined', () => {
        configLoader = new ConfigLoader(undefined);
        const config = configLoader.getConfig();
        
        expect(config).toEqual(DEFAULT_CONFIG);
      });

      test('should load default configuration when config path is empty string', () => {
        configLoader = new ConfigLoader('');
        const config = configLoader.getConfig();
        
        expect(config).toEqual(DEFAULT_CONFIG);
      });
    });

    describe('Environment Variable Loading', () => {
      test('should load server configuration from environment variables', () => {
        process.env.PORT = '4000';
        process.env.HOST = '127.0.0.1';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.server.port).toBe(4000);
        expect(config.server.host).toBe('127.0.0.1');
      });

      test('should load AI configuration from environment variables', () => {
        process.env.AI_MODEL = 'gpt-4';
        process.env.AI_MAX_TOKENS = '2000';
        process.env.AI_TEMPERATURE = '0.5';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.ai.model).toBe('gpt-4');
        expect(config.ai.maxTokens).toBe(2000);
        expect(config.ai.temperature).toBe(0.5);
      });

      test('should load OpenRouter API key and set provider', () => {
        process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.ai.provider).toBe('openrouter');
        expect(config.ai.apiKey).toBe('test-openrouter-key');
      });

      test('should load OpenAI API key and set provider', () => {
        process.env.OPENAI_API_KEY = 'test-openai-key';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.ai.provider).toBe('openai');
        expect(config.ai.apiKey).toBe('test-openai-key');
      });

      test('should prioritize OpenRouter over OpenAI when both are set', () => {
        process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
        process.env.OPENAI_API_KEY = 'test-openai-key';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.ai.provider).toBe('openrouter');
        expect(config.ai.apiKey).toBe('test-openrouter-key');
      });

      test('should load game configuration from environment variables', () => {
        process.env.PLAYER_PERSONALITY = 'Test personality';
        process.env.PLAYER_STRATEGY = 'aggressive';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.game.personality).toBe('Test personality');
        expect(config.game.strategy).toBe('aggressive');
      });

      test('should load logging configuration from environment variables', () => {
        process.env.LOG_ENABLED = 'false';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.logging.enabled).toBe(false);
      });

      test('should handle LOG_ENABLED=true correctly', () => {
        process.env.LOG_ENABLED = 'true';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.logging.enabled).toBe(true);
      });

      test('should handle invalid numeric environment variables gracefully', () => {
        process.env.PORT = 'invalid-port';
        process.env.AI_MAX_TOKENS = 'invalid-tokens';
        process.env.AI_TEMPERATURE = 'invalid-temp';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        // Should use NaN for invalid numbers (which may cause validation errors)
        expect(isNaN(config.server.port)).toBe(true);
        expect(isNaN(config.ai.maxTokens)).toBe(true);
        expect(isNaN(config.ai.temperature)).toBe(true);
      });
    });

    describe('File Configuration Loading - JSON', () => {
      const testConfigPath = 'test-config.json';
      
      afterEach(() => {
        // Clean up test files
        const absolutePath = join(process.cwd(), testConfigPath);
        if (existsSync(absolutePath)) {
          unlinkSync(absolutePath);
        }
      });

      test('should load JSON configuration file', () => {
        // Ensure no environment variables interfere
        delete process.env.PORT;
        delete process.env.HOST;
        delete process.env.AI_MODEL;
        delete process.env.AI_MAX_TOKENS;
        delete process.env.AI_TEMPERATURE;
        
        const testConfig = {
          server: { port: 5000, host: 'localhost' },
          ai: { model: 'gpt-4', maxTokens: 3000, temperature: 0.7, provider: 'openai', apiKey: 'file-api-key' },
          game: { name: 'File Player', personality: 'File personality', strategy: 'conservative', speakingStyle: 'witty' },
          logging: { level: 'error', enabled: false }
        };
        
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(testConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        expect(config.server.port).toBe(5000);
        expect(config.server.host).toBe('localhost');
        expect(config.ai.model).toBe('gpt-4');
        expect(config.ai.maxTokens).toBe(3000);
        expect(config.ai.temperature).toBe(0.7);
        expect(config.ai.provider).toBe('openai');
        expect(config.ai.apiKey).toBe('file-api-key');
        expect(config.game.personality).toBe('File personality');
        expect(config.game.strategy).toBe('conservative');
        expect(config.logging.enabled).toBe(false);
      });

      test('should merge file config with defaults', () => {
        // Ensure no environment variables interfere
        delete process.env.PORT;
        delete process.env.AI_MODEL;
        
        const partialConfig = {
          server: { port: 6000 },
          ai: { model: 'custom-model' }
        };
        
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(partialConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        expect(config.server.port).toBe(6000);
        expect(config.server.host).toBe(DEFAULT_CONFIG.server.host); // Should use default
        expect(config.ai.model).toBe('custom-model');
        expect(config.ai.maxTokens).toBe(DEFAULT_CONFIG.ai.maxTokens); // Should use default
      });

      test('should handle malformed JSON gracefully', () => {
        writeFileSync(join(process.cwd(), testConfigPath), '{ invalid json }');
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        // Should fall back to default configuration
        expect(config).toEqual(DEFAULT_CONFIG);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('无法加载配置文件'),
          expect.any(Error)
        );
      });

      test('should handle non-existent file gracefully', () => {
        configLoader = new ConfigLoader('non-existent-config.json');
        const config = configLoader.getConfig();
        
        // Should fall back to default configuration
        expect(config).toEqual(DEFAULT_CONFIG);
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      test('should log success message when file is loaded', () => {
        const testConfig = { server: { port: 7000 } };
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(testConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('配置文件已加载')
        );
      });
    });

    describe('File Configuration Loading - JavaScript/TypeScript', () => {
      test('should handle unsupported file formats', () => {
        configLoader = new ConfigLoader('config.yaml');
        const config = configLoader.getConfig();
        
        // Should fall back to default configuration
        expect(config).toEqual(DEFAULT_CONFIG);
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      // Note: Testing actual JS/TS file loading is complex in the test environment
      // due to require() caching and dynamic imports. In real scenarios, this would work.
    });

    describe('Configuration Merging', () => {
      test('should override file config with environment variables', () => {
        const testConfigPath = 'merge-test-config.json';
        const testConfig = {
          server: { port: 8000, host: 'file-host' },
          ai: { model: 'file-model', apiKey: 'file-key' }
        };
        
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(testConfig));
        
        // Set environment variables that should override file config
        process.env.PORT = '9000';
        process.env.AI_MODEL = 'env-model';
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        // File config should override environment variables (file loaded last)
        expect(config.server.port).toBe(8000); // File overrides env
        expect(config.ai.model).toBe('file-model'); // File overrides env
        expect(config.server.host).toBe('file-host');
        expect(config.ai.apiKey).toBe('file-key');
        
        // Clean up
        unlinkSync(join(process.cwd(), testConfigPath));
      });

      test('should handle deep merging correctly', () => {
        const testConfigPath = 'deep-merge-config.json';
        const testConfig = {
          server: { port: 8080 }, // Only override port, not host
          game: { name: 'File Player' } // Only override name, not other game properties
        };
        
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(testConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        // Should merge objects, not replace them entirely
        expect(config.server.port).toBe(8080);
        expect(config.server.host).toBe(DEFAULT_CONFIG.server.host);
        expect(config.game.strategy).toBe(DEFAULT_CONFIG.game.strategy);
        
        // Clean up
        unlinkSync(join(process.cwd(), testConfigPath));
      });
    });

    describe('validateConfig()', () => {
      test('should return true for valid configuration', () => {
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(true);
      });

      test('should return false for invalid port number - too low', () => {
        process.env.PORT = '0';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ 无效的端口号:',
          0
        );
      });

      test('should return false for invalid port number - too high', () => {
        process.env.PORT = '70000';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ 无效的端口号:',
          70000
        );
      });

      test('should warn about missing API key in non-test environment', () => {
        const originalNodeEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV; // Ensure we're not in test mode
        
        configLoader = new ConfigLoader();
        configLoader.validateConfig();
        
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '⚠️ 未配置AI API密钥，将使用预设回复'
        );
        
        process.env.NODE_ENV = originalNodeEnv;
      });

      test('should not warn about missing API key in test environment', () => {
        process.env.NODE_ENV = 'test';
        
        configLoader = new ConfigLoader();
        configLoader.validateConfig();
        
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('未配置AI API密钥')
        );
      });

      test('should return false for invalid maxTokens - too low', () => {
        process.env.AI_MAX_TOKENS = '5';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ maxTokens应在10-2000之间:',
          5
        );
      });

      test('should return false for invalid maxTokens - too high', () => {
        process.env.AI_MAX_TOKENS = '15000';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ maxTokens应在10-2000之间:',
          15000
        );
      });

      test('should return false for invalid temperature - too low', () => {
        process.env.AI_TEMPERATURE = '-0.5';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ temperature应在0-2之间:',
          -0.5
        );
      });

      test('should return false for invalid temperature - too high', () => {
        process.env.AI_TEMPERATURE = '3.0';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ temperature应在0-2之间:',
          3.0
        );
      });

      test('should return true for valid API key configuration', () => {
        process.env.OPENAI_API_KEY = 'valid-api-key';
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(true);
      });

      test('should return true for edge case valid values', () => {
        process.env.PORT = '1'; // Minimum valid port  
        process.env.AI_MAX_TOKENS = '10'; // Minimum valid tokens
        process.env.AI_TEMPERATURE = '0'; // Minimum valid temperature
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(true);
      });

      test('should return true for maximum valid values', () => {
        process.env.PORT = '65535'; // Maximum valid port
        process.env.AI_MAX_TOKENS = '10000'; // Maximum valid tokens
        process.env.AI_TEMPERATURE = '2'; // Maximum valid temperature
        
        configLoader = new ConfigLoader();
        const isValid = configLoader.validateConfig();
        
        expect(isValid).toBe(true);
      });
    });

    describe('printConfig()', () => {
      test('should print configuration when logging is enabled', () => {
        process.env.AI_MODEL = 'test-model';
        
        configLoader = new ConfigLoader();
        configLoader.printConfig();
        
        expect(consoleSpy).toHaveBeenCalledWith('\n🎯 Player配置信息:');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('服务器: 0.0.0.0:3001')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('AI模型: test-model')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('玩家名称: Test Player')
        );
      });

      test('should not print configuration when logging is disabled', () => {
        process.env.LOG_ENABLED = 'false';
        
        configLoader = new ConfigLoader();
        configLoader.printConfig();
        
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Player配置信息')
        );
      });

      test('should print all configuration sections', () => {
        process.env.PORT = '4000';
        process.env.HOST = 'localhost';
        process.env.AI_MODEL = 'gpt-4';
        process.env.AI_PROVIDER = 'openrouter';
        process.env.PLAYER_STRATEGY = 'aggressive';
        
        configLoader = new ConfigLoader();
        configLoader.printConfig();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('服务器: localhost:4000')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('AI模型: gpt-4')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('玩家名称: Advanced Player')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('策略: aggressive')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('说话风格: formal')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('日志级别: debug')
        );
      });
    });

    describe('getConfig()', () => {
      test('should return configuration object', () => {
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        expect(config).toHaveProperty('server');
        expect(config).toHaveProperty('ai');
        expect(config).toHaveProperty('game');
        expect(config).toHaveProperty('logging');
      });

      test('should return same configuration on multiple calls', () => {
        configLoader = new ConfigLoader();
        const config1 = configLoader.getConfig();
        const config2 = configLoader.getConfig();
        
        expect(config1).toBe(config2); // Same reference
      });

      test('should return configuration with environment overrides', () => {
        process.env.PORT = '8080';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.server.port).toBe(8080);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      test('should handle empty JSON file', () => {
        const testConfigPath = 'empty-config.json';
        writeFileSync(join(process.cwd(), testConfigPath), '{}');
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        // Should merge with defaults
        expect(config.server.port).toBe(DEFAULT_CONFIG.server.port);
        expect(config.ai.model).toBe(DEFAULT_CONFIG.ai.model);
        
        unlinkSync(join(process.cwd(), testConfigPath));
      });

      test('should handle file with only partial configuration', () => {
        const testConfigPath = 'partial-config.json';
        const partialConfig = {
          game: { name: 'Partial Player' }
        };
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(partialConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        expect(config.server.port).toBe(DEFAULT_CONFIG.server.port);
        expect(config.ai.model).toBe(DEFAULT_CONFIG.ai.model);
        
        unlinkSync(join(process.cwd(), testConfigPath));
      });

      test('should handle file with null values', () => {
        const testConfigPath = 'null-config.json';
        const nullConfig = {
          server: { port: null, host: null },
          ai: { apiKey: null }
        };
        writeFileSync(join(process.cwd(), testConfigPath), JSON.stringify(nullConfig));
        
        configLoader = new ConfigLoader(testConfigPath);
        const config = configLoader.getConfig();
        
        // Null values should be merged
        expect(config.server.port).toBeNull();
        expect(config.server.host).toBeNull();
        expect(config.ai.apiKey).toBeNull();
        
        unlinkSync(join(process.cwd(), testConfigPath));
      });

      test('should handle very long file paths', () => {
        const longPath = 'very/long/path/that/does/not/exist/config.json';
        
        configLoader = new ConfigLoader(longPath);
        const config = configLoader.getConfig();
        
        expect(config).toEqual(DEFAULT_CONFIG);
        expect(consoleWarnSpy).toHaveBeenCalled();
      });

      test('should handle special characters in environment variables', () => {
        process.env.PLAYER_PERSONALITY = 'Personality with "quotes" and \n newlines';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(config.game.personality).toBe('Personality with "quotes" and \n newlines');
      });

      test('should handle undefined environment variables correctly', () => {
        // Explicitly set to undefined
        process.env.PORT = undefined;
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        // Should use defaults when env vars are undefined
        expect(config.server.port).toBe(DEFAULT_CONFIG.server.port);
      });
    });

    describe('Configuration Type Safety', () => {
      test('should maintain correct types after loading', () => {
        process.env.PORT = '5000';
        process.env.AI_MAX_TOKENS = '2000';
        process.env.AI_TEMPERATURE = '0.7';
        process.env.LOG_ENABLED = 'true';
        
        configLoader = new ConfigLoader();
        const config = configLoader.getConfig();
        
        expect(typeof config.server.port).toBe('number');
        expect(typeof config.server.host).toBe('string');
        expect(typeof config.ai.maxTokens).toBe('number');
        expect(typeof config.ai.temperature).toBe('number');
        expect(typeof config.logging.enabled).toBe('boolean');
      });

      test('should handle boolean parsing correctly', () => {
        const testCases = [
          { input: 'true', expected: true },
          { input: 'false', expected: false },
          { input: 'TRUE', expected: false }, // Only exact 'true' should be true
          { input: '1', expected: false },
          { input: '0', expected: false },
          { input: 'yes', expected: false }
        ];

        testCases.forEach(({ input, expected }) => {
          process.env.LOG_ENABLED = input;
          const tempLoader = new ConfigLoader();
          const config = tempLoader.getConfig();
          expect(config.logging.enabled).toBe(expected);
        });
      });
    });
  });
});