import type {
  PlayerContext,
  StartGameParams,
  SpeechResponseType,
  VotingResponseType,
  NightActionResponseType
} from '@ai-werewolf/types';
import pRetry, { AbortError } from 'p-retry';

export class PlayerAPIClient {
  private url: string;
  private playerId: number;
  
  // 不该重试的状态码
  private static readonly NON_RETRYABLE_STATUS = [400, 401, 403, 404, 422];

  constructor(playerId: number, url: string) {
    this.playerId = playerId;
    this.url = url;
  }

  // 函数重载 - 精确的类型映射
  private async call(endpoint: 'start-game', params: StartGameParams): Promise<void>;
  private async call(endpoint: 'speak', params: PlayerContext): Promise<SpeechResponseType>;
  private async call(endpoint: 'vote', params: PlayerContext): Promise<VotingResponseType>;
  private async call(endpoint: 'use-ability', params: PlayerContext): Promise<NightActionResponseType | null>;
  private async call(
    endpoint: 'use-ability' | 'speak' | 'vote' | 'start-game', 
    params: PlayerContext | StartGameParams
  ): Promise<unknown> {
    return pRetry(
      async () => {
        const response = await fetch(`${this.url}/api/player/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(45000) // AI需要更长时间
        });
        
        if (response.ok) {
          // start-game 没有响应体
          if (endpoint === 'start-game') {
            return;
          }
          return await response.json();
        }
        
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        
        // 精确的错误分类
        if (PlayerAPIClient.NON_RETRYABLE_STATUS.includes(response.status)) {
          throw new AbortError(error.message);
        }
        
        // 5xx、429、408等值得重试
        throw error;
      },
      {
        retries: endpoint === 'start-game' ? 1 : 3, // 初始化快速失败
        minTimeout: 1000,
        maxTimeout: 10000,
        factor: 2,
        onFailedAttempt: error => {
          console.warn(`⚠️ Player ${this.playerId} [${endpoint}] retry ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber}: ${error.message}`);
        }
      }
    );
  }

  async useAbility(params: PlayerContext): Promise<NightActionResponseType | null> {
    return this.call('use-ability', params);
  }

  async speak(params: PlayerContext): Promise<SpeechResponseType> {
    return this.call('speak', params);
  }

  async vote(params: PlayerContext): Promise<VotingResponseType> {
    return this.call('vote', params);
  }

  async startGame(params: StartGameParams): Promise<void> {
    return this.call('start-game', params);
  }
}