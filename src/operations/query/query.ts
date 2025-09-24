import { SuiClient } from '@mysten/sui/client';

import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, Obligation, Reserve, RewardConfig, UserReward } from '../../types/object';

export class ElendMarketQueryOperation implements IElendMarketQueryOperation {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  fetchMarket(marketId: string): Promise<Market> {
    throw new Error('Method not implemented.');
  }
  fetchReserve(reserveId: string): Promise<Reserve> {
    throw new Error('Method not implemented.');
  }
  async fetchObligation(obligationId: string): Promise<Obligation> {
    const response = await this.client.getObject({
      id: obligationId,
      options: {
        showOwner: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch obligation');
    }

    return response.data!;
  }
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]> {
    throw new Error('Method not implemented.');
  }
  fetchUserReward(reserveId: string, obligationId: string, owner: string): Promise<UserReward> {
    throw new Error('Method not implemented.');
  }
}
