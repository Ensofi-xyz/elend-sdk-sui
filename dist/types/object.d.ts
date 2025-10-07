import { Decimal } from '../utils/decimal';
export interface MarketRegistry {
}
export interface Market {
    id: string;
    name: string;
    reserve_infos: string;
    reserves: string[];
}
export interface Reserve {
    id: string;
    liquidity: ReserveLiquidity;
    collateral: ReserveCollateral;
    config: ReserveConfig;
    lastUpdate: LastUpdate;
}
export interface ReserveLiquidity {
    mintTokenType: string;
    availableAmount: bigint;
    borrowedAmount: Decimal;
    marketPrice: Decimal;
    marketPriceLastUpdatedTs: number;
    mintDecimal: number;
    depositLimitCrossedTs: number;
    borrowLimitCrossedTs: number;
    cumulativeBorrowRate: Decimal;
    accumulatedProtocolFees: Decimal;
}
export interface ReserveCollateral {
    mintTotalAmount: bigint;
}
export interface ReserveConfig {
    status: number;
    assetTier: number;
    baseFixedInterestRateBps: number;
    reserveFactorRateBps: number;
    maxInterestRateBps: number;
    loanToValueBps: number;
    liquidationThresholdBps: number;
    liquidationMaxDebtCloseFactorBps: number;
    liquidationPenaltyBps: number;
    borrowRateAtOptimalBps: number;
    borrowFactorBps: number;
    borrowFeeBps: number;
    depositLimit: bigint;
    borrowLimit: bigint;
    tokenInfo: TokenInfo;
    depositWithdrawalCap: WithdrawalCap;
    debtWithdrawalCap: WithdrawalCap;
    utilizationOptimalBps: number;
    utilizationLimitBlockBorrowingAboveBps: number;
    minNetValueInObligation: Decimal;
}
export interface TokenInfo {
    symbol: string;
    tokenType: string;
    upperHeuristic: bigint;
    lowerHeuristic: bigint;
    expHeuristic: bigint;
    maxTwapDivergenceBps: bigint;
    maxAgePriceSeconds: bigint;
    maxAgeTwapSeconds: bigint;
    pythPriceFeedId: string | null;
    switchboardPrice: string | null;
    blockPriceUsage: number;
}
export interface WithdrawalCap {
    configCapacity: bigint;
    currentTotal: bigint;
    lastIntervalStartTimestamp: bigint;
    configIntervalLengthSeconds: bigint;
}
export interface LastUpdate {
    timestampMs: bigint;
    stale: boolean;
    priceStatus: number;
}
export interface ObligationOwnerCap {
    id: string;
    obligation: string;
}
export interface ObligationCollateral {
    id: string;
    depositedAmount: number;
    marketValue: Decimal;
}
export interface ObligationLiquidity {
    id: string;
    borrowedAmount: Decimal;
    cumulativeBorrowRate: Decimal;
    marketValue: Decimal;
    borrowFactorAdjustedMarketValue: Decimal;
}
export interface Obligation {
    id: string;
    owner: string;
    deposits: string[];
    borrows: string[];
    lowestReserveDepositLiquidationLtv: number;
    totalDepositedValue: Decimal;
    borrowFactorAdjustedDebtValue: Decimal;
    highestBorrowFactorBps: number;
    allowedBorrowValue: Decimal;
    unhealthyBorrowValue: Decimal;
    depositsTokenType: string;
    borrowsTokenType: string;
    depositsTier: string;
    borrowsTier: string;
    numOfObsoleteReserves: number;
    hasDebt: boolean;
    lastUpdate: LastUpdate;
    locking: boolean;
    liquidatingAssetReserve: number;
    obligationCollateral: Map<string, ObligationCollateral>;
    obligationLiquidity: Map<string, ObligationLiquidity>;
}
export interface RewardConfig {
    reserve: string;
    rewardTokenType: string;
    option: number;
    totalFunds: bigint;
    totalDistributed: Decimal;
    startedAt: bigint;
    endAt: bigint;
    initialGlobalRewardIndex: Decimal;
    lastGlobalRewardIndex: Decimal;
    lastUpdatedAt: bigint;
    phase: number;
}
export interface UserReward {
    id: string;
    owner: string;
    reserve: string;
    option: number;
    tokenType: string;
    userRewardIndex: Decimal;
    earnedAmount: Decimal;
    claimedAmount: Decimal;
    phase: number;
}
