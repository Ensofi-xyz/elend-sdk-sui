import { SuiClient } from '@mysten/sui/client';

import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, MarketRegistry, Obligation, ObligationOwnerCap, Reserve, RewardConfig, UserReward } from '../../types/object';

export class ElendMarketQueryOperation implements IElendMarketQueryOperation {
  private suiClient: SuiClient;
  private networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig, client: SuiClient) {
    this.suiClient = client;
    this.networkConfig = networkConfig;
  }

  async fetchObligationOwnerCapObject(owner: string): Promise<ObligationOwnerCap | null> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${packageInfo.marketType['MAIN_POOL']}>`;
    const response = await this.suiClient.getOwnedObjects({
      owner: owner,
      options: {
        showContent: true,
      },
      filter: {
        StructType: obligationOwnerCapStructType,
      },
    });

    return response.data[0] as ObligationOwnerCap;
  }

  async fetchMarket(marketId: string): Promise<Market | null> {
    const response = await this.suiClient.getObject({
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
    const response = await this.suiClient.getObject({
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
    const response = await this.suiClient.getObject({
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
