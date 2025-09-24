import { Transaction } from '@mysten/sui/transactions';

import { Market, Obligation, Reserve, RewardConfig, UserReward } from '../types/object';

export interface DepositReserveLiquidityAndObligationCollateralOperationArgs {}

export interface WithdrawCTokensAndRedeemLiquidityOperationArgs {}

export interface BorrowObligationLiquidityOperationArgs {}

export interface RepayObligationLiquidityOperationArgs {}

export interface IDepositElendMarketOperation {
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Transaction;
}

export interface IWithdrawElendMarketOperation {
  buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Transaction;
}

export interface IBorrowElendMarketOperation {
  buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Transaction;
}

export interface IRepayElendMarketOperation {
  buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Transaction;
}

export interface ClaimRewardOperationArgs {}

export interface IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction;
}

export interface IElendMarketQueryOperation {
  fetchMarket(marketId: string): Market;
  fetchReserve(reserveId: string): Reserve;
  fetchObligation(obligationId: string): Obligation;
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): RewardConfig[];
  fetchUserReward(reserveId: string, obligationId: string, owner: string): UserReward;
}

export interface IElendMarketCalculationOperation {
  getTotalSuppliedUSDValueOnMarket(): void;
  getTotalBorrowedUSDValueOnMarket(): void;
  getDetailSuppliedOnMarket(): void;
  getDetailBorrowedOnMarket(): void;
  getDetailSupplyApy(): void;
  getDetailBorrowApy(): void;
  totalSupplyAPYWithNewAvailableSupplyAmount(): void;
  totalBorrowAPYWithNewBorrowedAmount(): void;
  getTotalSuppliedUSDValueObligation(): void;
  getTotalBorrowedUSDValueObligation(): void;
  getDetailSuppliedOnMarketObligation(): void;
  getDetailBorrowedOnMarketObligation(): void;
  calculateCurrentHealthRatioObligation(): void;
  calculateRemainingBorrowAmount(): void;
  calculateAllowedWithdrawAmount(): void;
  getTotalIncentiveRewardStatisticObligation(): void;
  calculateIncentiveRewardApyInterest(): void;
  estimateIncentiveRewardNewApyInterest(): void;
}
