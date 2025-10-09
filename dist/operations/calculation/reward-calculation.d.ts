import { Decimal as DecimalJs } from 'decimal.js';
import { IElendMarketRewardCalculationOperation } from '../../interfaces/operations';
import { DetailIncentiveRewardRes, Obligation, Reserve, UserActionType } from '../../types';
import { ElendMarketQueryOperation } from '../query/query';
export declare class ElendMarketRewardCalculationOperation implements IElendMarketRewardCalculationOperation {
    private readonly queryOperation;
    constructor(queryOperation: ElendMarketQueryOperation);
    getTotalIncentiveRewardStatisticObligation(obligation: Obligation, associateReserves: Map<string, Reserve>, reserveTokenPrice: Map<string, DecimalJs>, marketType: string, reserves?: string[]): Promise<DetailIncentiveRewardRes[]>;
    calculateIncentiveRewardApyInterest(reserve: Reserve, marketType: string, option: number): Promise<Map<string, DecimalJs>>;
    estimateIncentiveRewardNewApyInterest(reserve: Reserve, marketType: string, option: number, amount: number, userAction: UserActionType): Promise<Map<string, DecimalJs>>;
    private estimatePendingReward;
}
