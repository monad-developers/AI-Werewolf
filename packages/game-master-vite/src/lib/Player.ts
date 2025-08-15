import { 
  type PlayerId, 
  Role, 
  type PlayerContext, 
  type WitchContext, 
  type SeerContext, 
  type WerewolfAbilityResponse, 
  type WitchAbilityResponse, 
  type SeerAbilityResponse,
  WerewolfNightActionSchema, 
  WitchNightActionSchema, 
  SeerNightActionSchema,
  SpeechResponseSchema,
  VotingResponseSchema,
  type SpeechResponseType,
  type VotingResponseType
} from '@ai-werewolf/types';
import { PlayerAPIClient } from './PlayerAPIClient';
import { GameMaster } from './GameMaster';
import { playersToInfo } from './utils';

// 基础 Player 抽象类
export abstract class BasePlayer {
  gameId: string;
  id: PlayerId;
  apiClient: PlayerAPIClient;
  position: number;
  isAlive: boolean;
  abstract role: Role;

  constructor(gameId: string, id: PlayerId, apiClient: PlayerAPIClient, position: number) {
    this.gameId = gameId;
    this.id = id;
    this.apiClient = apiClient;
    this.position = position;
    this.isAlive = true;
  }

  async useAbility(gameMaster: GameMaster): Promise<any>{
    const abilityParams = this.buildContext(gameMaster);
    return this.apiClient.useAbility(abilityParams);
  };

  async vote(gameMaster: GameMaster): Promise<VotingResponseType | null> {
    const voteParams = this.buildContext(gameMaster);
    const response = await this.apiClient.vote(voteParams);
    
    if (response) {
      // 使用 zod 验证返回结果
      const validatedResponse = VotingResponseSchema.parse(response);
      return validatedResponse;
    }
    
    return null;
  }

  async speak(gameMaster: GameMaster): Promise<SpeechResponseType | null> {
    const speechParams = this.buildContext(gameMaster);
    const response = await this.apiClient.speak(speechParams);
    
    if (response) {
      // 使用 zod 验证返回结果
      const validatedResponse = SpeechResponseSchema.parse(response);
      return validatedResponse;
    }
    
    return null;
  }

  async startGame(teammates: PlayerId[]): Promise<any> {
    return this.apiClient.startGame({
      gameId: this.gameId,
      role: this.role,
      playerId: this.id,
      teammates
    });
  }

  protected buildContext(gameMaster: GameMaster):PlayerContext {
    return {
      round:gameMaster.round,
      currentPhase:gameMaster.currentPhase,
      alivePlayers: playersToInfo(gameMaster.alivePlayers),
      allSpeeches: gameMaster.getSpeeches(),
      allVotes: gameMaster.allVotes
    };
  }
}

// 村民类
export class VillagerPlayer extends BasePlayer {
  role: Role.VILLAGER = Role.VILLAGER;

  async useAbility(_gameMaster: GameMaster): Promise<null> {
    // 村民没有特殊能力
    return null;
  }
}

// 狼人类
export class WerewolfPlayer extends BasePlayer {
  role: Role.WEREWOLF = Role.WEREWOLF;

  async useAbility(gameMaster: GameMaster): Promise<WerewolfAbilityResponse | null> {
    const response = await super.useAbility(gameMaster);
    
    if (response) {
      // 使用 zod 验证返回结果
      const validatedResponse = WerewolfNightActionSchema.parse(response);
      return validatedResponse;
    }
    
    return null;
  }
  
  protected buildContext(gameMaster: GameMaster) {
    return {
      ...super.buildContext(gameMaster),
    }
  }
}

// 女巫类
export class WitchPlayer extends BasePlayer {
  role: Role.WITCH = Role.WITCH;
  healUsedOn: number = 0;
  poisonUsedOn: number = 0;

  hasHealPotion(): boolean {
    return this.healUsedOn === 0;
  }

  hasPoisonPotion(): boolean {
    return this.poisonUsedOn === 0;
  }

  async useAbility(gameMaster: GameMaster): Promise<WitchAbilityResponse | null> {
    const response = await super.useAbility(gameMaster);
    
    if (response) {
      // 使用 zod 验证返回结果
      const validatedResponse = WitchNightActionSchema.parse(response);
      return validatedResponse;
    }
    
    return null;
  }

  protected buildContext(gameMaster: GameMaster): WitchContext {
    return {
      ...super.buildContext(gameMaster),
      killedTonight: gameMaster.nightTemp?.werewolfTarget,
      potionUsed: {
        heal: this.healUsedOn > 0,
        poison: this.poisonUsedOn > 0
      }
    };
  }

  getAbilityStatus() {
    return {
      healUsed: this.healUsedOn > 0,
      healUsedOn: this.healUsedOn,
      poisonUsed: this.poisonUsedOn > 0,
      poisonUsedOn: this.poisonUsedOn,
      canHeal: this.healUsedOn === 0,
      canPoison: this.poisonUsedOn === 0
    };
  }
}

// 预言家类
export class SeerPlayer extends BasePlayer {
  role: Role.SEER = Role.SEER;
  investigatedPlayers: string[] = [];

  async useAbility(gameMaster: GameMaster): Promise<SeerAbilityResponse | null> {
    const response = await super.useAbility(gameMaster);
    
    if (response) {
      // 使用 zod 验证返回结果
      const validatedResponse = SeerNightActionSchema.parse(response);
      return validatedResponse;
    }
    
    return null;
  }

  protected buildContext(gameMaster: GameMaster): SeerContext {
    return {
      ...super.buildContext(gameMaster),
      investigatedPlayers: gameMaster.getInvestigatedPlayers()
    };
  }
}

// 联合类型
export type Player = VillagerPlayer | WerewolfPlayer | WitchPlayer | SeerPlayer;

// 类型守卫函数
export function isWerewolfPlayer(player: Player): player is WerewolfPlayer {
  return player.role === Role.WEREWOLF;
}

export function isWitchPlayer(player: Player): player is WitchPlayer {
  return player.role === Role.WITCH;
}

export function isSeerPlayer(player: Player): player is SeerPlayer {
  return player.role === Role.SEER;
}

export function isVillagerPlayer(player: Player): player is VillagerPlayer {
  return player.role === Role.VILLAGER;
}

// 工厂函数创建 Player
export function createPlayer(
  role: Role,
  playerId: PlayerId,
  apiClient: PlayerAPIClient,
  gameId: string,
  position: number
): Player {
  switch (role) {
    case Role.WEREWOLF:
      return new WerewolfPlayer(gameId, playerId, apiClient, position);

    case Role.WITCH:
      return new WitchPlayer(gameId, playerId, apiClient, position);

    case Role.SEER:
      return new SeerPlayer(gameId, playerId, apiClient, position);

    case Role.VILLAGER:
    default:
      return new VillagerPlayer(gameId, playerId, apiClient, position);
  }
}


