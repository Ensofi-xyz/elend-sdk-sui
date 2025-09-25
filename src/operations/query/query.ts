import { SuiClient } from '@mysten/sui/client';

import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, MarketRegistry, Obligation, Reserve, RewardConfig, UserReward } from '../../types/object';

export class ElendMarketQueryOperation implements IElendMarketQueryOperation {
  private client: SuiClient;

  constructor(client: SuiClient) {
    this.client = client;
  }

  async fetchMarket(marketId: string): Promise<Market | null> {
    const response = await this.client.getObject({
      id: marketId,
      options: {
        showContent: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch reserve');
    }

    if (response.data?.content) {
      const data = (response.data?.content as any)['fields'];
      return {
        id: data.id.id,
        name: data.name,
        reserves: data.reserves,
        reserve_infos: data.reserve_infos.fields.id.id,
      } as Market;
    } else {
      return null;
    }
  }

  async fetchReserve(reserveId: string): Promise<Reserve | null> {
    const response = await this.client.getObject({
      id: reserveId,
      options: {
        showContent: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch reserve');
    }

    //TODO update this
    return null;
  }

  async fetchObligation(obligationId: string): Promise<Obligation | null> {
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

    //TODO update this
    return null;
  }

  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]> {
    throw new Error('Method not implemented.');
  }
  fetchUserReward(reserveId: string, obligationId: string, owner: string): Promise<UserReward> {
    throw new Error('Method not implemented.');
  }
}
