import { makeAutoObservable, computed } from 'mobx';
import { OperationLogSystem, RoleAssignment, SpeechSystem } from '@ai-werewolf/lib';
import { createGameTrace, initializeLangfuse } from './langfuse';
import { GamePhase, type NightTempState, Role, type PlayerId, type Round, type SeerAbilityResponse, type WerewolfAbilityResponse, WinCondition, type WitchAbilityResponse, type InvestigatedPlayers, type AllVotes, type Vote } from '@ai-werewolf/types';
import { type Client } from './Client';
import { type Player, isWerewolfPlayer, isSeerPlayer, isWitchPlayer, createPlayer, type WitchPlayer } from './Player';
import { PlayerAPIClient } from './PlayerAPIClient';

export class GameMaster {
  // 单个游戏实例的属性
  public readonly gameId: string;
  public clients: Client[] = [];
  public currentPhase: GamePhase = GamePhase.PREPARING;
  public round: Round = 0;
  public votes: Record<number, number> = {};
  public nightTemp: NightTempState = {};
  public seerResult:InvestigatedPlayers = {}

  public speechSystem: SpeechSystem = new SpeechSystem();
  public operationLogSystem: OperationLogSystem = new OperationLogSystem();
  public allVotes: AllVotes = {};

  constructor(gameId: string, playerCount?: number) {
    this.gameId = gameId;
    makeAutoObservable(this, {
      gameId: false, // readonly property
      recentOperationLogs: computed,
      operationLogSystem: true, // 确保operationLogSystem是observable
      speechSystem: true, // 确保speechSystem是observable
    });
    
    initializeLangfuse();
    createGameTrace(gameId);
    console.log(`🎮 Created GameMaster for game ${gameId} with Langfuse trace ${this.gameId}`);
    
    if (playerCount) {
      this.init(playerCount);
    }
  }

  private init(playerCount: number): void {
    this.operationLogSystem.logSystemAction(`游戏创建成功，等待${playerCount}个玩家加入`);
    console.log(`🎮 GameMaster initialized for game ${this.gameId} with Langfuse trace ${this.gameId}`);
  }

  getInvestigatedPlayers(): InvestigatedPlayers {
    return this.seerResult
  }

  getGameState() {
    return {
      currentPhase: this.currentPhase,
      round: this.round,
      players: this.players.map(p => ({
        id: p.id,
        isAlive: p.isAlive,
        role: p.role
      }))
    };
  }

  public get alivePlayers() {
    return this.players.filter(c => c.isAlive);
  }

  // 通用函数：获取指定类型的活着的玩家（返回第一个）
  private getAlivePlayerOfType<T extends Player>(
    typeGuard: (p: Player) => p is T
  ): T | null {
    const players = this.players.filter((p): p is T => 
      typeGuard(p) && p.isAlive
    );
    return players.length > 0 ? players[0] : null;
  }

  public get players(): Player[] {
    return this.clients
      .filter(c => c.player)
      .map(c => c.player!);
  }

  private processWerewolfAction(result: WerewolfAbilityResponse): void {
    if(result.action == 'idle') return
    this.nightTemp.werewolfTarget = result.target;
    console.log(`🎯 Werewolf target: ${result.target}`);
  }

  private processWitchAction(player: WitchPlayer, result: WitchAbilityResponse): void {
    // 处理女巫的行动
    if (result.action === 'using') {
      // 检查是否对同一个目标使用两种药水
      if (result.healTarget > 0 && result.poisonTarget > 0 && result.healTarget === result.poisonTarget) {
        console.log(`⚠️ 女巫不能对同一个玩家同时使用解药和毒药`);
        this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', `尝试对玩家${result.healTarget}同时使用解药和毒药`);
        return;
      }

      if (result.healTarget > 0) {
        if (!player.hasHealPotion()) {
          console.log(`女巫没有解药了`);
          this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', '解药已用完');
        } else {
          this.nightTemp!.witchHealTarget = result.healTarget;
          player.healUsedOn = result.healTarget; // 更新药水使用状态
          console.log(`💊 Witch heal target: ${result.healTarget}`);
          this.operationLogSystem.logPlayerResponse(player.id, '使用解药', `救了玩家${result.healTarget}`);
        }
      }

      if (result.poisonTarget > 0) {
        if (!player.hasPoisonPotion()) {
          console.log(`女巫没有毒药了`);
          this.operationLogSystem.logPlayerResponse(player.id, '能力使用失败', '毒药已用完');
        } else {
          this.nightTemp!.witchPoisonTarget = result.poisonTarget;
          player.poisonUsedOn = result.poisonTarget; // 更新药水使用状态
          console.log(`☠️ Witch poison target: ${result.poisonTarget}`);
          this.operationLogSystem.logPlayerResponse(player.id, '使用毒药', `毒了玩家${result.poisonTarget}`);
        }
      }
    } else {
      console.log(`💤 Witch chose not to use potions`);
      this.operationLogSystem.logPlayerResponse(player.id, '不使用能力', '选择不使用药水');
    }
  }

  private processSeerAction(result: SeerAbilityResponse): void {
    const targetPlayer = this.players.find(p => p.id === result.target);
    
    if (!targetPlayer) {
      console.error(`❌ 预言家查验失败：找不到玩家ID ${result.target}`);
      return;
    }
    
    const isGood = targetPlayer.role !== Role.WEREWOLF;
    
    console.log(`🔮 预言家查验结果：
      - 目标玩家ID: ${result.target}
      - 目标角色: ${targetPlayer.role}
      - 是否为好人: ${isGood}
      - 结果解释: ${isGood ? '好人' : '狼人'}`);
    
    this.seerResult[this.round] = {
      target: result.target,
      isGood: isGood,
    };
  }

  /**
   * 计算夜晚死亡的玩家
   * @returns 
   */
  private calculateNightDeaths(): PlayerId[] {
    const deaths: PlayerId[] = [];
    const nightTemp = this.nightTemp;

    if (!nightTemp) return deaths;

    // 如果狼人杀了人
    if (nightTemp.werewolfTarget) {
      // 检查女巫是否救了这个人
      if (nightTemp.witchHealTarget && nightTemp.witchHealTarget === nightTemp.werewolfTarget) {
        console.log(`🧙 Witch saved player${nightTemp.werewolfTarget} from werewolf attack`);
      } else {
        // 女巫没救，这个人死了
        deaths.push(nightTemp.werewolfTarget);
      }
    }

    // 如果女巫毒了人
    if (nightTemp.witchPoisonTarget) {
      deaths.push(nightTemp.witchPoisonTarget);
    }

    return deaths;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }


  async createGame(playerCount: number): Promise<string> {
    // 游戏ID已经在构造函数中设置
    this.operationLogSystem.logSystemAction(`游戏创建成功，等待${playerCount}个玩家加入`);
    console.log(`🎮 GameMaster initialized for game ${this.gameId} with Langfuse trace ${this.gameId}`);
    return this.gameId;
  }

  async startGame(): Promise<void> {
    this.currentPhase = GamePhase.NIGHT;
    this.round++;

    // 记录操作日志
    this.operationLogSystem.logSystemAction('游戏正式开始！');
    this.operationLogSystem.logPhaseChange('夜晚', 1);

    // 添加游戏开始的系统通知
    await this.addSpeech(-1, '🌟 游戏开始！进入第1天夜晚阶段。', 'system');

    // 通知所有AI玩家游戏开始和他们的角色
    await this.notifyPlayersGameStart();

    await this.triggerPhaseActions();
  }

  private async notifyPlayersGameStart(): Promise<void> {
    console.log(`🔔 Starting to notify ${this.players.length} players...`);

    for (let i = 0; i < this.clients.length; i++) {
      const client = this.clients[i];
      const player = client.player!;
      const url = client.url;

      // 获取队友（如果是狼人）
      const teammates = player.role === Role.WEREWOLF
        ? this.players.filter(p => p.role === Role.WEREWOLF).map(p => p.id)
        : [];

      const result = await player.startGame(teammates);

      if (result) {
        console.log(`✅ Successfully notified ${player.id} (${player.role}) at ${url}`);
        console.log(`   Response:`, result);
      } else {
        console.error(`❌ Failed to notify player ${player.id} at ${url}`);
      }
    }

    console.log(`🔔 Finished notifying all players.`);
  }

  private async triggerPhaseActions(): Promise<void> {
    console.log(`🎭 Triggering actions for phase: ${this.currentPhase}`);

    switch (this.currentPhase) {
      case GamePhase.NIGHT:
        await this.triggerNightActions();
        break;
      case GamePhase.DAY:
        await this.triggerDayActions();
        break;
      case GamePhase.VOTING:
        await this.triggerVotingActions();
        break;
      default:
        console.log(`⏸️ No actions defined for phase: ${this.currentPhase}`);
    }
  }

  private async triggerNightActions(): Promise<void> {
    console.log(`🌙 Night phase - triggering werewolf and special role actions`);

    // 初始化夜间暂存状态
    this.nightTemp = {};

    const allSpeeches = this.speechSystem.getAllSpeeches();
    const totalSpeeches = Object.values(allSpeeches).flat().length;
    console.log(`📊 Available speeches for night ${this.round}: ${totalSpeeches} speeches`);

    // 狼人夜间杀人
    const leadWerewolf = this.getAlivePlayerOfType(isWerewolfPlayer);

    if (leadWerewolf) {

      console.log(`🐺 Asking ${leadWerewolf.id} to choose kill target`);
      console.log('🔍 About to call logPlayerRequest');
      this.operationLogSystem.logPlayerRequest(leadWerewolf.id, '选择杀害目标');
      console.log('🔍 logPlayerRequest called');

      const result = await leadWerewolf.useAbility(this);

      if (result) {
        console.log(`🐺 Werewolf action result:`, result);

        // 记录狼人行动结果
        this.operationLogSystem.logPlayerResponse(leadWerewolf.id, '夜间杀害', `行动:${result.action}, 击杀玩家${result.target}。${result.reason}`);

        // 处理狼人杀人目标
        this.processWerewolfAction(result);

      } else {
        this.operationLogSystem.logResult(`狼人 ${leadWerewolf.id} 行动失败`);
      }
    }

    // 预言家查验
    const seer = this.getAlivePlayerOfType(isSeerPlayer);
    if (seer) {
      console.log(`🔮 Asking ${seer.id} to choose investigation target`);
      this.operationLogSystem.logPlayerRequest(seer.id, '选择查验目标');

      const result = await seer.useAbility(this);

      if (result) {
        console.log(`🔮 Seer investigation result:`, result);

        // 记录预言家查验结果
        this.operationLogSystem.logPlayerResponse(seer.id, '夜间查验', `查验玩家${result.target}。${result.reason}`);

        // 处理预言家查验结果
        this.processSeerAction(result);

        // seerResult已经保存，不添加到公开speech以免暴露身份
      } else {
        this.operationLogSystem.logResult(`预言家 ${seer.id} 查验失败`);
      }
    }

    // 女巫行动
    const witch = this.getAlivePlayerOfType(isWitchPlayer);
    if (witch) {
      console.log(`🧙 Asking ${witch.id} to use abilities`);
      this.operationLogSystem.logPlayerRequest(witch.id, '是否使用药水');

      try {
        // 调用API
        const result = await witch.useAbility(this);

        if (result) {
          console.log(`🧙 Witch action result:`, result);

          // 构建行动描述
          let actionDesc = '';
          if (result.action === 'using') {
            if (result.healTarget > 0) {
              actionDesc += `救了玩家${result.healTarget}。${result.healReason} `;
            }
            if (result.poisonTarget > 0) {
              actionDesc += `毒了玩家${result.poisonTarget}。${result.poisonReason}`;
            }
          } else {
            actionDesc = '选择不使用药水。' + (result.healReason || result.poisonReason || '');
          }

          // 记录女巫行动结果
          this.operationLogSystem.logPlayerResponse(witch.id, '药水使用', actionDesc);

          // 处理女巫的行动
          this.processWitchAction(witch,result);

          // 女巫行动已记录到operationLog，不添加到公开speech以免暴露身份
        } else {
          this.operationLogSystem.logResult(`女巫 ${witch.id} 行动失败`);
        }
      } catch (error) {
        console.error(`Error getting witch action:`, error);
      }
    }

    // 处理夜间最终死亡结果
    const deaths = this.calculateNightDeaths();

    if (deaths.length > 0) {
      for (const playerId of deaths) {
        const victim = this.players.find(p => p.id === playerId);
        if (victim && victim.isAlive) {
          victim.isAlive = false;
          console.log(`💀 ${victim.id} died during the night`);
          this.operationLogSystem.logResult(`${victim.id} 在夜间死亡`);
        }
      }

      // 添加死亡公告
      const victimNames = deaths.map(id => this.players.find(p => p.id === id)?.id).filter(Boolean);
      await this.addSpeech(-1, `💀 昨晚 ${victimNames.join('、')} 死亡了！`, 'system');
      
      // 检查游戏是否结束
      const winCondition = await this.getWinCondition();
      if (winCondition !== WinCondition.ONGOING) {
        return; // 游戏已结束，停止继续执行
      }
    } else {
      // 如果没有人被杀死，也要公告
      await this.addSpeech(-1, '🌅 昨晚是平安夜，没有人死亡。', 'system');
    }

    // 夜间阶段完成
    this.operationLogSystem.logPhaseComplete('夜间', '🌙 夜间阶段完成，所有夜间行动已结束，可以进入白天阶段');
  }



  private async triggerDayActions(): Promise<void> {
    console.log(`☀️ Day phase - triggering discussion`);

    // 让所有存活玩家发言
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isAlive) continue;

      console.log(`💬 Asking ${player.id} to speak in day discussion`);
      this.operationLogSystem.logPlayerRequest(player.id, '发言');

      const result = await player.speak(this);
            if (result) {
        console.log(`💬 ${player.id} said: ${result.speech}`);

        // 记录发言结果
        this.operationLogSystem.logPlayerResponse(player.id, '发言', `"${result.speech}"`);

        // 添加玩家发言
        await this.addSpeech(player.id, result.speech);
      } else {
        this.operationLogSystem.logResult(`${player.id} 发言失败`);
      }
    }

    // 白天阶段完成
    this.operationLogSystem.logPhaseComplete('白天', '☀️ 白天阶段完成，所有玩家发言已结束，可以进入投票阶段');
  }

  private async triggerVotingActions(): Promise<void> {
    console.log(`🗳️ Voting phase - collecting votes`);

    // 让所有存活玩家投票
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.isAlive) continue;

      console.log(`🗳️ Asking ${player.id} to vote`);
      this.operationLogSystem.logPlayerRequest(player.id, '投票');

      const result = await player.vote(this);

      if (result) {
        console.log(`🗳️ ${player.id} voted: ${result.target}, reason: ${result.reason}`);

        // 记录投票结果，包含投票理由
        this.operationLogSystem.logPlayerResponse(player.id, '投票', `投给 ${result.target}`);
        if (result.reason) {
          this.operationLogSystem.logPlayerResponse(player.id, '投票理由', result.reason);
        }

        // 查找被投票的玩家ID
        const targetPlayer = this.players.find(p => p.id === result.target);
        if (targetPlayer) {
          await this.castVote(player.id, targetPlayer.id);
        }
      } else {
        this.operationLogSystem.logResult(`${player.id} 投票失败`);
      }
    }

    // 处理投票结果
    this.operationLogSystem.logSystemAction('开始统计投票结果');
    const eliminatedPlayerId = await this.processVotes();
    if (eliminatedPlayerId) {
      const eliminatedPlayer = this.players.find(p => p.id === eliminatedPlayerId);
      if (eliminatedPlayer) {
        console.log(`⚰️ ${eliminatedPlayer.id} was eliminated by vote`);

        // 记录淘汰结果
        this.operationLogSystem.logResult(`${eliminatedPlayer.id} 被投票淘汰！`);

        // 添加淘汰公告
        await this.addSpeech(-1, `⚰️ ${eliminatedPlayer.id} 被投票淘汰了！`, 'system');
        
        // 检查游戏是否结束
        const winCondition = await this.getWinCondition();
        if (winCondition !== WinCondition.ONGOING) {
          return; // 游戏已结束，停止继续执行
        }
      }
    } else {
      this.operationLogSystem.logResult('投票平票，无人被淘汰');
      await this.addSpeech(-1, '🤝 投票平票，无人被淘汰！', 'system');
    }

    // 投票阶段完成
    this.operationLogSystem.logPhaseComplete('投票', '🗳️ 投票阶段完成，投票结果已处理，可以进入下一阶段');
  }

  // This GameMaster instance manages a single game, so getGameState is not needed

  async addPlayer(playerId: number, url: string): Promise<void> {
    console.log(`👤 Adding player ${playerId} to game ${this.gameId}`);

    // 只添加客户端信息，角色信息在assignRoles时分配
    const client: Client = {
      id: playerId,
      url: url
    };

    this.clients.push(client);
    this.operationLogSystem.logSystemAction(`玩家 ${playerId} 加入游戏`);
    console.log(`✅ Client ${playerId} added to game ${this.gameId}`);
  }

  async assignRoles(): Promise<void> {
    this.operationLogSystem.logSystemAction(`开始为 ${this.clients.length} 个玩家分配角色`);
    const roleConfigs = RoleAssignment.getDefaultRoleConfig(this.clients.length);

    // 生成并打乱角色数组
    const roles: Role[] = roleConfigs.flatMap(config => 
      Array(config.count).fill(config.role)
    );
    const shuffledRoles = this.shuffleArray(roles);

    // 为每个客户端分配角色并创建Player对象
    this.clients.forEach((client, index) => {
      const assignedRole = shuffledRoles[index];
      const playerAPIClient = new PlayerAPIClient(client.id, client.url);
      
      // 使用工厂函数创建正确的Player类实例
      client.player = createPlayer(
        assignedRole,
        client.id,
        playerAPIClient,
        this.gameId,
        index
      );

      console.log(`🎭 Player ${client.id} assigned role: ${assignedRole}`);
    });
  }

  async nextPhase(): Promise<GamePhase> {
    // 检查游戏是否已经结束
    if (this.currentPhase === GamePhase.ENDED) {
      console.log('🏁 Game has already ended, cannot advance phase');
      return this.currentPhase;
    }

    // 直接实现阶段切换逻辑
    const phaseOrder = [GamePhase.NIGHT, GamePhase.DAY, GamePhase.VOTING];
    const currentIndex = phaseOrder.indexOf(this.currentPhase);
    const nextIndex = (currentIndex + 1) % phaseOrder.length;
    this.currentPhase = phaseOrder[nextIndex];

    if (this.currentPhase === GamePhase.NIGHT) {
      this.round++;
    }

    // 记录阶段切换
    const phaseNames = {
      [GamePhase.PREPARING]: '准备',
      [GamePhase.NIGHT]: '夜晚',
      [GamePhase.DAY]: '白天',
      [GamePhase.VOTING]: '投票',
      [GamePhase.ENDED]: '结束'
    };

    this.operationLogSystem.logPhaseChange(phaseNames[this.currentPhase], this.round);

    // 添加阶段切换的系统通知
    const phaseEmojis = {
      [GamePhase.PREPARING]: '⏳ 准备',
      [GamePhase.NIGHT]: '🌙 夜晚',
      [GamePhase.DAY]: '☀️ 白天',
      [GamePhase.VOTING]: '🗳️ 投票',
      [GamePhase.ENDED]: '🏁 结束'
    };

    await this.addSpeech(-1, `${phaseEmojis[this.currentPhase]} 阶段开始（第${this.round}天）`, 'system');

    console.log(`🔄 Game ${this.gameId} advanced to phase: ${this.currentPhase}, day: ${this.round}`);

    // 触发对应阶段的AI玩家行动
    await this.triggerPhaseActions();

    return this.currentPhase;
  }

  async castVote(voterId: number, targetId: number): Promise<void> {
    if (!this.votes) {
      this.votes = {};
    }

    this.votes[voterId] = targetId;
    
    // 同时记录到 allVotes 中
    if (!this.allVotes[this.round]) {
      this.allVotes[this.round] = [];
    }
    
    // 检查是否已经有这个投票者的记录，如果有则更新，否则添加新记录
    const existingVoteIndex = this.allVotes[this.round].findIndex(vote => vote.voterId === voterId);
    const newVote: Vote = { voterId, targetId };
    
    if (existingVoteIndex >= 0) {
      this.allVotes[this.round][existingVoteIndex] = newVote;
    } else {
      this.allVotes[this.round].push(newVote);
    }
  }

  async processVotes(): Promise<number | null> {
    const voteCounts = this.countVotes(this.votes || {});
    const eliminatedPlayerId = this.determineElimination(voteCounts);

    if (eliminatedPlayerId) {
      await this.eliminatePlayer(eliminatedPlayerId);
    }

    // Clear votes after processing
    this.votes = {};

    return eliminatedPlayerId;
  }

  async eliminatePlayer(playerId: number): Promise<void> {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isAlive = false;
    }
  }

  async getWinCondition(): Promise<WinCondition> {
    console.log(`🔍 GameMaster.getWinCondition called for gameId: ${this.gameId}`);
    console.log(`✅ Checking win condition...`);
    
    // 直接在这里实现胜利条件检查逻辑
    const alivePlayers = this.players.filter(p => p.isAlive);
    const aliveWerewolves = alivePlayers.filter(p => p.role === Role.WEREWOLF);
    const aliveVillagers = alivePlayers.filter(p => p.role !== Role.WEREWOLF);
    const totalPlayers = this.players.length;

    let winCondition: WinCondition;
    if (aliveWerewolves.length === 0) {
      // 好人胜利：所有狼人被消灭
      winCondition = WinCondition.VILLAGERS_WIN;
    } else if (totalPlayers === 6) {
      // 6人局：狼人数量大于等于好人数量时狼人获胜（1对1时狼人胜）
      if (aliveWerewolves.length >= aliveVillagers.length) {
        winCondition = WinCondition.WEREWOLVES_WIN;
      } else {
        winCondition = WinCondition.ONGOING;
      }
    } else if (totalPlayers >= 9) {
      // 9人及以上：狼人数量大于等于好人数量时狼人获胜
      if (aliveWerewolves.length >= aliveVillagers.length) {
        winCondition = WinCondition.WEREWOLVES_WIN;
      } else {
        winCondition = WinCondition.ONGOING;
      }
    } else {
      // 其他人数：狼人数量大于等于好人数量时狼人获胜（默认规则）
      if (aliveWerewolves.length >= aliveVillagers.length) {
        winCondition = WinCondition.WEREWOLVES_WIN;
      } else {
        winCondition = WinCondition.ONGOING;
      }
    }

    // 添加游戏结束的系统消息
    if (winCondition !== WinCondition.ONGOING) {
      if (winCondition === WinCondition.WEREWOLVES_WIN) {
        await this.addSpeech(-1, '🐺 游戏结束！狼人获胜！', 'system');
      } else if (winCondition === WinCondition.VILLAGERS_WIN) {
        await this.addSpeech(-1, '👥 游戏结束！好人获胜！', 'system');
      }
      this.currentPhase = GamePhase.ENDED;
    }

    console.log(`🏆 Win condition: ${winCondition}`);
    return winCondition;
  }

  private countVotes(votes: Record<number, number>): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const targetId of Object.values(votes)) {
      counts[targetId] = (counts[targetId] || 0) + 1;
    }
    return counts;
  }

  private determineElimination(voteCounts: Record<number, number>): number | null {
    let maxVotes = 0;
    let eliminatedPlayer: number | null = null;
    let tieCount = 0;

    for (const [playerId, votes] of Object.entries(voteCounts)) {
      const playerIdNum = parseInt(playerId);
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminatedPlayer = playerIdNum;
        tieCount = 1;
      } else if (votes === maxVotes && votes > 0) {
        tieCount++;
      }
    }

    // 如果有平票，没有人被淘汰
    return tieCount === 1 ? eliminatedPlayer : null;
  }

  async addSpeech(playerId: number, content: string, type: 'player' | 'system' = 'player'): Promise<void> {
    const speech = {
      playerId,
      content,
      type
    };

    this.speechSystem.addSpeech(this.round, speech);
  }

  getSpeeches() {
    return this.speechSystem.getAllSpeeches();
  }

  async getOperationLogs(): Promise<any[]> {
    return this.operationLogSystem.getLogs();
  }

  async getRecentOperationLogs(count: number): Promise<any[]> {
    return this.operationLogSystem.getRecentLogs(count);
  }

  // MobX computed 属性，用于UI组件直接访问
  get recentOperationLogs() {
    const logs = this.operationLogSystem.getLogs(); // 移除了 slice(-20) 限制，显示所有操作记录
    console.log('🔍 recentOperationLogs getter called, returning:', logs.length, 'logs');
    return logs;
  }

}

// GameMaster 工厂函数 - 现在需要gameId参数
export function createGameMaster(gameId: string, playerCount?: number): GameMaster {
  return new GameMaster(gameId, playerCount);
}

// 游戏管理器 - 管理多个GameMaster实例
import { v4 as uuidv4 } from 'uuid';

class GameManager {
  private games: Map<string, GameMaster> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  createGame(playerCount: number): string {
    const gameId = uuidv4();
    const gameMaster = new GameMaster(gameId, playerCount);
    this.games.set(gameId, gameMaster);
    return gameId;
  }

  getGame(gameId: string): GameMaster | undefined {
    return this.games.get(gameId);
  }

  removeGame(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  getAllGames(): string[] {
    return Array.from(this.games.keys());
  }
}

// 全局游戏管理器实例
export const gameManager = new GameManager();

// 保持向后兼容 - 为第一个游戏创建默认实例
const defaultGameId = uuidv4();
export const gameMaster = createGameMaster(defaultGameId);