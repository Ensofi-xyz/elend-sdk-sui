import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { Market, MarketRegistry, Obligation, ObligationOwnerCap, Reserve, RewardConfig, UserReward } from '../types/object';
import { NetworkConfig } from './config';

// Lending Operations
export interface InitObligationArgs {
  owner: string;
  marketType: string;
}

export interface DepositReserveLiquidityAndObligationCollateralOperationArgs {
  owner: string;
  reserve: string;
  amount: number;
  marketType: string;
}

export interface WithdrawCTokensAndRedeemLiquidityOperationArgs {
  owner: string;
  reserve: string;
  collateralAmount: number;
  marketType: string;
}

export interface BorrowObligationLiquidityOperationArgs {
  owner: string;
  reserve: string;
  amount: number;
  marketType: string;
}

export interface RepayObligationLiquidityOperationArgs {
  owner: string;
  reserve: string;
  amount: number;
  marketType: string;
}

export interface IDepositElendMarketOperation {
  buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction>;
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
}

export interface IWithdrawElendMarketOperation {
  buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Promise<Transaction>;
}

export interface IBorrowElendMarketOperation {
  buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Promise<Transaction>;
}

export interface IRepayElendMarketOperation {
  buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Promise<Transaction>;
}

// Reward Operations
export interface ClaimRewardOperationArgs {}

export interface IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction;
}

// Query Operations
export interface IElendMarketQueryOperation {
  fetchObligationOwnerCapObject(owner: string, marketTypes: string): Promise<ObligationOwnerCap | null>;
  fetchMarket(marketId: string): Promise<Market | null>;
  fetchReserve(reserveId: string): Promise<Reserve | null>;
  fetchObligation(obligationId: string): Promise<Obligation | null>;
  fetchRewardConfigs(reserveId: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]>;
  fetchUserReward(reserveId: string, obligationId: string, owner: string): Promise<UserReward | null>;
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
