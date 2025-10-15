import { Decimal as DecimalJs } from 'decimal.js';

import { Transaction } from '@mysten/sui/transactions';

import { DetailBorrowApyRes, DetailBorrowedRes, DetailIncentiveRewardRes, DetailSuppliedRes, DetailSupplyApyRes } from '../types/client';
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
  collateralAmount: bigint;
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
  amount: bigint;
  decimals: number;
  marketType: string;
}

export interface IDepositElendMarketOperation {
  buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction>;
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
  buildInitAndDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
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
export interface ClaimRewardOperationArgs {
  owner: string;
  reserve: string;
  marketType: string;
  option: number;
}

export interface IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Promise<Transaction>;
}

// Query Operations
export interface IElendMarketQueryOperation {
  fetchObligationOwnerCapObject(owner: string, marketTypes: string): Promise<ObligationOwnerCap | null>;
  fetchMarket(marketId: string): Promise<Market | null>;
  fetchReserve(reserveId: string): Promise<Reserve | null>;
  fetchObligation(obligationId: string): Promise<Obligation | null>;
  fetchRewardConfigs(reserveId: string, marketType: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]>;
  fetchUserReward(reserveId: string, rewardTokenType: string, option: number, obligationId: string, owner: string): Promise<UserReward | null>;
}

// Calculation Operations
export interface IElendMarketReserveCalculationOperation {
  getTotalSuppliedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
  getTotalBorrowedUSDValueOnMarket(reserves: Reserve[]): DecimalJs;
  getDetailSuppliedOnMarket(reserves: Reserve[]): DetailSuppliedRes[];
  getDetailBorrowedOnMarket(reserves: Reserve[]): DetailBorrowedRes[];
  getDetailSupplyApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailSupplyApyRes>;
  getDetailBorrowApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailBorrowApyRes>;
  totalSupplyAPYWithNewAvailableSupplyAmount(
    reserve: Reserve,
    marketType: string,
    newAvailableAmount: bigint,
    currentTimestampMs: number,
    userAction: UserActionType
  ): Promise<DecimalJs>;
  totalBorrowAPYWithNewBorrowedAmount(
    reserve: Reserve,
    marketType: string,
    newAvailableLiquidity: bigint,
    newBorrowedAmount: Decimal,
    currentTimestampMs: number,
    userAction: UserActionType
  ): Promise<DecimalJs>;
  getTotalSupply(reserve: Reserve): DecimalJs;
  getBorrowedAmount(reserve: Reserve): DecimalJs;
  getEstimatedBorrowedAmount(reserve: Reserve, timestampMs: number): DecimalJs;
  getTotalMintCollateral(reserve: Reserve): DecimalJs;
  getCumulativeBorrowRate(reserve: Reserve): DecimalJs;
  calculateSupplyAPR(reserve: Reserve, timestampMs: number): number;
  calculateBorrowAPR(reserve: Reserve, timestampMs?: number): number;
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
    borrowReserve: Reserve
  ): DecimalJs;
  calculateAllowedWithdrawAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    withdrawReserve: string,
    permissiveWithdrawMax: boolean
  ): DecimalJs;
}

export interface IElendMarketRewardCalculationOperation {
  getTotalIncentiveRewardStatisticObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    marketType: string,
    reserves?: string[]
  ): Promise<DetailIncentiveRewardRes[]>;
  calculateIncentiveRewardApyInterest(reserve: Reserve, marketType: string, option: number): Promise<Map<string, DecimalJs>>;
  estimateIncentiveRewardNewApyInterest(
    reserve: Reserve,
    marketType: string,
    option: number,
    amount: number,
    userAction: UserActionType
  ): Promise<Map<string, DecimalJs>>;
}
