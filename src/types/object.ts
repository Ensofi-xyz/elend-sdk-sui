import { Decimal } from '../utils/decimal';

export interface MarketRegistry {}

export interface Market {}

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
  pythPriceFeedId: string | null; // Option<String> in Move
  switchboardPrice: string | null; // Option<String> in Move
  blockPriceUsage: number;
}

export interface WithdrawalCap {
  configCapacity: any; // TODO: Update I64 type mapping
  currentTotal: any; // TODO: Update I64 type mapping
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
export interface Obligation {}

export interface RewardConfig {}

export interface UserReward {}
