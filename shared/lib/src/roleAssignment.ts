import { Role } from '@ai-werewolf/types';

export interface RoleConfig {
  role: Role;
  count: number;
}

export class RoleAssignment {
  static getDefaultRoleConfig(playerCount: number): RoleConfig[] {
    const configs: RoleConfig[] = [];
    
    if (playerCount < 6) {
      throw new Error('Minimum 6 players required');
    }

    // 六人局特殊配置：2狼人、1预言家、1女巫、2村民
    if (playerCount === 6) {
      configs.push({ role: Role.WEREWOLF, count: 2 });
      configs.push({ role: Role.SEER, count: 1 });
      configs.push({ role: Role.WITCH, count: 1 });
      configs.push({ role: Role.VILLAGER, count: 2 });
      return configs;
    }

    // 八人局特殊配置：2狼人、1预言家、1女巫、4村民
    if (playerCount === 8) {
      configs.push({ role: Role.WEREWOLF, count: 2 });
      configs.push({ role: Role.SEER, count: 1 });
      configs.push({ role: Role.WITCH, count: 1 });
      configs.push({ role: Role.VILLAGER, count: 4 });
      return configs;
    }

    // 其他人数的标准配置
    const werewolfCount = Math.floor(playerCount / 3);
    configs.push({ role: Role.WEREWOLF, count: werewolfCount });
    
    configs.push({ role: Role.SEER, count: 1 });
    
    if (playerCount >= 8) {
      configs.push({ role: Role.WITCH, count: 1 });
    }

    const specialRolesCount = configs.reduce((sum, config) => 
      config.role !== Role.WEREWOLF ? sum + config.count : sum, 0
    );
    const villagerCount = playerCount - werewolfCount - specialRolesCount;
    
    configs.push({ role: Role.VILLAGER, count: villagerCount });

    return configs;
  }
}