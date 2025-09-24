import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, Obligation, Reserve, RewardConfig, UserReward } from '../../types/object';

export class ElendMarketQueryOperation implements IElendMarketQueryOperation {
  fetchMarket(marketId: string): Market {
    throw new Error('Method not implemented.');
  }
  fetchReserve(reserveId: string): Reserve {
    throw new Error('Method not implemented.');
  }
  fetchObligation(obligationId: string): Obligation {
    throw new Error('Method not implemented.');
  }
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): RewardConfig[] {
    throw new Error('Method not implemented.');
  }
  fetchUserReward(reserveId: string, obligationId: string, owner: string): UserReward {
    throw new Error('Method not implemented.');
  }
}
