import { Transaction } from '@mysten/sui/transactions';

interface DepositReserveLiquidityAndObligationCollateralOperationArgs {}

interface WithdrawCTokensAndRedeemLiquidityOperationArgs {}

interface BorrowObligationLiquidityOperationArgs {}

interface RepayObligationLiquidityOperationArgs {}

export interface IElendMarketLendingOperation {
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Transaction;
  buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Transaction;
  buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Transaction;
  buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Transaction;
}

interface ClaimRewardOperationArgs {}

export interface IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction;
}

export interface IElendMarketQueryOperation {
  fetchMarket(marketId: string): void;
  fetchReserve(reserveId: string): void;
  fetchObligation(obligationId: string): void;
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): void;
  fetchUserReward(reserveId: string, obligationId: string, owner: string): void;
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
