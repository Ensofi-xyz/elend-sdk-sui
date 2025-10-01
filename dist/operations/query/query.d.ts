import { SuiClient } from '@mysten/sui/client';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, Obligation, ObligationOwnerCap, Reserve, RewardConfig, UserReward } from '../../types/object';
export declare class ElendMarketQueryOperation implements IElendMarketQueryOperation {
    private suiClient;
    private networkConfig;
    constructor(networkConfig: NetworkConfig, client: SuiClient);
    fetchObligationOwnerCapObject(owner: string, marketType: string): Promise<ObligationOwnerCap | null>;
    fetchMarket(marketId: string): Promise<Market | null>;
    fetchReserve(reserveId: string): Promise<Reserve | null>;
    fetchObligation(obligationId: string): Promise<Obligation | null>;
    fetchRewardConfigs(reserveId: string, marketType: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]>;
    fetchUserReward(reserveId: string, rewardTokenType: string, option: number, obligationId: string, owner: string): Promise<UserReward | null>;
}
