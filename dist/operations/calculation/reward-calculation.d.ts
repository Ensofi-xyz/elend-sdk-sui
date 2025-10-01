import { IElendMarketRewardCalculationOperation } from '../../interfaces/operations';
export declare class ElendMarketRewardCalculationOperation implements IElendMarketRewardCalculationOperation {
    constructor();
    getTotalIncentiveRewardStatisticObligation(): void;
    calculateIncentiveRewardApyInterest(): void;
    estimateIncentiveRewardNewApyInterest(): void;
}
