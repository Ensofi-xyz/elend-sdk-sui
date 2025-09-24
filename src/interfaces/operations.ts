import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { Market, Obligation, Reserve, RewardConfig, UserReward } from '../types/object';
import { NetworkConfig } from './config';

// Lending Operations
export interface InitObligationArgs {
  owner: string;
  suiClient: SuiClient;
}

export interface DepositReserveLiquidityAndObligationCollateralOperationArgs {
  owner: string;
  reserve: string;
  amount: number;
  suiClient: SuiClient;
}

export interface WithdrawCTokensAndRedeemLiquidityOperationArgs {}

export interface BorrowObligationLiquidityOperationArgs {}

export interface RepayObligationLiquidityOperationArgs {}

export interface IDepositElendMarketOperation {
  buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction>;
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
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

// Reward Operations
export interface ClaimRewardOperationArgs {}

export interface IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction;
}

// Query Operations
export interface IElendMarketQueryOperation {
  fetchMarket(marketId: string): Promise<Market>;
  fetchReserve(reserveId: string): Promise<Reserve>;
  fetchObligation(obligationId: string): Promise<Obligation>;
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]>;
  fetchUserReward(reserveId: string, obligationId: string, owner: string): Promise<UserReward>;
}

// Calculation Operations
export interface IElendMarketReserveCalculationOperation {
  getTotalSuppliedUSDValueOnMarket(): void;
  getTotalBorrowedUSDValueOnMarket(): void;
  getDetailSuppliedOnMarket(): void;
  getDetailBorrowedOnMarket(): void;
  getDetailSupplyApy(): void;
  getDetailBorrowApy(): void;
  totalSupplyAPYWithNewAvailableSupplyAmount(): void;
  totalBorrowAPYWithNewBorrowedAmount(): void;
}

export interface IElendMarketObligationCalculationOperation {
  getTotalSuppliedUSDValueObligation(): void;
  getTotalBorrowedUSDValueObligation(): void;
  getDetailSuppliedOnMarketObligation(): void;
  getDetailBorrowedOnMarketObligation(): void;
  calculateCurrentHealthRatioObligation(): void;
  calculateRemainingBorrowAmount(): void;
  calculateAllowedWithdrawAmount(): void;
}

export interface IElendMarketRewardCalculationOperation {
  getTotalIncentiveRewardStatisticObligation(): void;
  calculateIncentiveRewardApyInterest(): void;
  estimateIncentiveRewardNewApyInterest(): void;
}
