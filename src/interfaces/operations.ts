import { Decimal as DecimalJs } from 'decimal.js';

import { Transaction } from '@mysten/sui/transactions';

import { DetailBorrowApyRes, DetailBorrowedRes, DetailSuppliedRes, DetailSupplyApyRes } from '../types/client';
import { UserActionType } from '../types/common';
import { Market, MarketRegistry, Obligation, ObligationOwnerCap, Reserve, RewardConfig, UserReward } from '../types/object';
import { Decimal } from '../utils';

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
  getTotalSuppliedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
  getTotalBorrowedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
  getDetailSuppliedOnMarket(reserves: Reserve[]): DetailSuppliedRes[];
  getDetailBorrowedOnMarket(reserves: Reserve[]): DetailBorrowedRes[];
  getDetailSupplyApy(reserve: Reserve, currentTimestampMs: number): DetailSupplyApyRes;
  getDetailBorrowApy(reserve: Reserve, currentTimestampMs: number): DetailBorrowApyRes;
  totalSupplyAPYWithNewAvailableSupplyAmount(
    reserve: Reserve,
    newAvailableAmount: bigint,
    currentTimestampMs: number,
    userAction: UserActionType
  ): DecimalJs;
  totalBorrowAPYWithNewBorrowedAmount(
    reserve: Reserve,
    newAvailableLiquidity: bigint,
    newBorrowedAmount: Decimal,
    currentTimestampMs: number,
    userAction: UserActionType
  ): DecimalJs;
}

export interface IElendMarketObligationCalculationOperation {
  getTotalSuppliedUSDValueObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs;
  getTotalBorrowedUSDValueObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs;
  getDetailSuppliedOnMarketObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserves?: Reserve[]
  ): DetailSuppliedRes[];
  getDetailBorrowedOnMarketObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserves?: Reserve[]
  ): DetailBorrowedRes[];
  calculateCurrentHealthRatioObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs;
  calculateRemainingBorrowAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    borrowReserve: string
  ): DecimalJs;
  calculateAllowedWithdrawAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    withdrawReserve: string
  ): DecimalJs;
}

export interface IElendMarketRewardCalculationOperation {
  getTotalIncentiveRewardStatisticObligation(): void;
  calculateIncentiveRewardApyInterest(): void;
  estimateIncentiveRewardNewApyInterest(): void;
}
