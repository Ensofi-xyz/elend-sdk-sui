import { Decimal as DecimalJs } from 'decimal.js';
import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { ConfigLoader } from './core/config-loader';
import { NetworkConfig } from './interfaces/config';
import {
  IBorrowElendMarketOperation,
  IDepositElendMarketOperation,
  IElendMarketObligationCalculationOperation,
  IElendMarketQueryOperation,
  IElendMarketReserveCalculationOperation,
  IElendMarketRewardCalculationOperation,
  IElendMarketRewardOperation,
  IRepayElendMarketOperation,
  IWithdrawElendMarketOperation,
} from './interfaces/operations';
import { ElendMarketObligationCalculationOperation } from './operations/calculation/obligation-calculation';
import { ElendMarketReserveCalculationOperation } from './operations/calculation/reserve-calculation';
import { ElendMarketRewardCalculationOperation } from './operations/calculation/reward-calculation';
import { BorrowElendMarketOperation } from './operations/lending/borrow';
import { DepositElendMarketOperation } from './operations/lending/deposit';
import { RepayElendMarketOperation } from './operations/lending/repay';
import { WithdrawElendMarketOperation } from './operations/lending/withdraw';
import { ElendMarketQueryOperation } from './operations/query/query';
import { ElendMarketRewardOperation } from './operations/reward/reward';
import {
  DetailBorrowApyRes,
  DetailBorrowedRes,
  DetailIncentiveRewardRes,
  DetailSuppliedRes,
  DetailSupplyApyRes,
  MarketClientRes,
  ReserveClientRes,
} from './types/client';
import { Network, UserActionType } from './types/common';
import { Market, Obligation, Reserve } from './types/object';
import { Decimal as DecimalFraction } from './utils/decimal';
import { getSuiClientInstance } from './utils/sui-client';

export class ElendClient {
  public readonly networkConfig: NetworkConfig;
  public readonly suiClient: SuiClient;

  public markets: MarketClientRes[];
  public obligationOwner: string | null;
  public obligations: Map<string, Obligation>; //Market - Obligation
  public reserves: Map<string, Reserve[]>; // Market - Reserves

  private readonly depositOperation: IDepositElendMarketOperation;
  private readonly borrowOperation: IBorrowElendMarketOperation;
  private readonly withdrawOperation: IWithdrawElendMarketOperation;
  private readonly repayOperation: IRepayElendMarketOperation;

  readonly rewardOperation: IElendMarketRewardOperation;
  readonly queryOperation: IElendMarketQueryOperation;

  readonly reserveCalculationOperation: IElendMarketReserveCalculationOperation;
  readonly obligationCalculationOperation: IElendMarketObligationCalculationOperation;
  readonly rewardCalculationOperation: IElendMarketRewardCalculationOperation;

  constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.networkConfig = networkConfig;
    this.suiClient = suiClient;

    this.markets = [];
    this.obligationOwner = null;
    this.obligations = new Map<string, Obligation>();
    this.reserves = new Map<string, Reserve[]>();

    this.depositOperation = new DepositElendMarketOperation(networkConfig, suiClient);
    this.borrowOperation = new BorrowElendMarketOperation(networkConfig, suiClient);
    this.withdrawOperation = new WithdrawElendMarketOperation(networkConfig, suiClient);
    this.repayOperation = new RepayElendMarketOperation(networkConfig, suiClient);

    this.rewardOperation = new ElendMarketRewardOperation(networkConfig, suiClient);
    const queryOperation = new ElendMarketQueryOperation(networkConfig, suiClient);
    this.queryOperation = queryOperation;

    this.reserveCalculationOperation = new ElendMarketReserveCalculationOperation(queryOperation);
    this.obligationCalculationOperation = new ElendMarketObligationCalculationOperation(queryOperation);

    this.rewardCalculationOperation = new ElendMarketRewardCalculationOperation(queryOperation);
  }

  static async create(
    network: Network,
    options?: {
      isLoadData: boolean;
      obligationOwner?: string;
      suiClient?: SuiClient;
    }
  ): Promise<ElendClient> {
    const networkConfig = ConfigLoader.loadNetworkConfig(network);
    const suiClient = isNil(options?.suiClient) ? getSuiClientInstance(networkConfig.rpcUrl, networkConfig.wsRpcUrl) : options.suiClient;
    const elendClient = new ElendClient(networkConfig, suiClient);

    if (!isNil(options) && options.isLoadData) {
      await elendClient.loadMarket();
      await elendClient.loadReserves();
    }

    if (!isNil(options?.obligationOwner)) {
      await elendClient.loadObligation(options.obligationOwner);
    }

    return elendClient;
  }

  async loadMarket(): Promise<void> {
    const marketConfigs = this.networkConfig.packages[this.networkConfig.latestVersion].lendingMarkets;
    for (const [marketType, marketConfig] of Object.entries(marketConfigs)) {
      const market = await this.queryOperation.fetchMarket(marketConfig.id);
      if (isNil(market)) continue;
      this.markets.push({
        id: market.id,
        name: market.name,
        marketType,
        reserveIds: market.reserves,
      });
    }
  }

  async loadObligation(obligationOwner: string): Promise<void> {
    this.obligationOwner = obligationOwner;
    if (this.markets.length == 0) await this.loadMarket();
    const marketTypes = this.markets.map(market => market.marketType);
    for (const marketType of marketTypes) {
      const obligationOwnerCap = await this.queryOperation.fetchObligationOwnerCapObject(obligationOwner, marketType);
      if (isNil(obligationOwnerCap)) continue;
      const obligationId = obligationOwnerCap.obligation;
      const obligation = await this.queryOperation.fetchObligation(obligationId);
      if (isNil(obligation)) continue;
      this.obligations.set(marketType, obligation);
    }
  }

  async loadReserves() {
    if (this.markets.length == 0) await this.loadMarket();
    for (const market of this.markets) {
      const reserves = [];
      for (const reserveId of market.reserveIds) {
        const reserve = await this.queryOperation.fetchReserve(reserveId);
        if (isNil(reserve)) continue;
        reserves.push(reserve);
      }

      this.reserves.set(market.marketType, reserves);
    }
  }

  async reloadObligation(): Promise<void> {
    if (isNil(this.obligationOwner)) {
      throw Error('Not load obligation owner yet');
    }
    this.loadObligation(this.obligationOwner);
  }

  async reloadReserves(): Promise<void> {
    await this.loadReserves();
  }

  async getMarkets(): Promise<MarketClientRes[]> {
    if (this.markets.length == 0) {
      const marketConfigs = this.networkConfig.packages[this.networkConfig.latestVersion].lendingMarkets;
      for (const [marketType, marketConfig] of Object.entries(marketConfigs)) {
        const market = await this.queryOperation.fetchMarket(marketConfig.id);
        if (isNil(market)) continue;
        this.markets.push({
          id: market.id,
          name: market.name,
          marketType,
          reserveIds: market.reserves,
        });
      }
    }

    return this.markets;
  }

  async getReserves(marketTypeInput?: string): Promise<Map<string, ReserveClientRes[]>> {
    if (this.reserves.size == 0) {
      await this.loadReserves();
    }
    const result = new Map<string, ReserveClientRes[]>();
    for (const [marketType, reserves] of this.reserves.entries()) {
      if (marketTypeInput && marketType != marketType) continue;
      const reserveRes = reserves.map(reserve => {
        return {
          id: reserve.id,
          marketType,
          tokenLiquidity: {
            symbol: reserve.config.tokenInfo.symbol,
            decimals: reserve.liquidity.mintDecimal,
            tokenType: reserve.liquidity.mintTokenType,
          },
        };
      });
      result.set(marketType, reserveRes);
    }

    return result;
  }

  async initObligation(marketType: string): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Not load obligation owner yet');
    }

    return this.depositOperation.buildInitObligationTxn({
      owner: this.obligationOwner,
      marketType,
    });
  }

  async deposit(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const marketType = this.getMarketTypeOfReserve(reserve);
    return this.depositOperation.buildDepositTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
      marketType,
    });
  }

  async borrow(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const marketType = this.getMarketTypeOfReserve(reserve);
    return this.borrowOperation.buildBorrowTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
      marketType,
    });
  }

  async withdraw(reserve: string, collateralAmount: bigint): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const marketType = this.getMarketTypeOfReserve(reserve);
    return this.withdrawOperation.buildWithdrawTxn({
      owner: this.obligationOwner,
      reserve,
      collateralAmount,
      marketType,
    });
  }

  async repay(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const marketType = this.getMarketTypeOfReserve(reserve);
    return this.repayOperation.buildRepayTxn({
      amount: liquidityAmount,
      owner: this.obligationOwner,
      reserve,
      marketType,
    });
  }

  async claim_reward(reserve: string, option: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const marketType = this.getMarketTypeOfReserve(reserve);
    return this.rewardOperation.buildClaimRewardTxn({
      owner: this.obligationOwner,
      reserve,
      marketType,
      option,
    });
  }

  getTotalSuppliedUSDValueOnMarket(marketType: string, reserveIds?: string[]): DecimalJs {
    const reserves = this.reserves.get(marketType);
    if (!reserves) return DecimalJs(0);
    return this.reserveCalculationOperation.getTotalSuppliedUSDValueOnMarket(
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  getTotalBorrowedUSDValueOnMarket(marketType: string, reserveIds?: string[]): DecimalJs {
    const reserves = this.reserves.get(marketType);
    if (!reserves) return DecimalJs(0);
    return this.reserveCalculationOperation.getTotalBorrowedUSDValueOnMarket(
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  getDetailSuppliedOnMarket(marketType: string, reserveIds?: string[]): DetailSuppliedRes[] {
    const reserves = this.reserves.get(marketType);
    if (!reserves) return [];
    return this.reserveCalculationOperation.getDetailSuppliedOnMarket(
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  getDetailBorrowedOnMarket(marketType: string, reserveIds?: string[]): DetailBorrowedRes[] {
    const reserves = this.reserves.get(marketType);
    if (!reserves) return [];
    return this.reserveCalculationOperation.getDetailBorrowedOnMarket(
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  async getDetailSupplyApy(reserveId: string): Promise<DetailSupplyApyRes> {
    const currentTimestampMs = new Date().getTime();
    const marketType = this.getMarketTypeOfReserve(reserveId);
    const reserves = this.reserves.get(marketType);
    if (!reserves) throw new Error(`Not found reserves in market: ${marketType}`);
    const reserve = reserves.find(reserve => reserve.id == reserveId);
    if (!reserve) throw new Error(`Not found reserve id ${reserveId}`);
    return this.reserveCalculationOperation.getDetailSupplyApy(reserve, marketType, currentTimestampMs);
  }

  async getDetailBorrowApy(reserveId: string): Promise<DetailBorrowApyRes> {
    const currentTimestampMs = new Date().getTime();
    const marketType = this.getMarketTypeOfReserve(reserveId);
    const reserves = this.reserves.get(marketType);
    if (!reserves) throw new Error(`Not found reserves in market: ${marketType}`);
    const reserve = reserves.find(reserve => reserve.id == reserveId);
    if (!reserve) throw new Error(`Not found reserve id ${reserveId}`);
    return this.reserveCalculationOperation.getDetailBorrowApy(reserve, marketType, currentTimestampMs);
  }

  async totalSupplyAPYWithNewAvailableSupplyAmount(reserveId: string, newAvailableAmount: bigint, userAction: UserActionType): Promise<DecimalJs> {
    const currentTimestampMs = new Date().getTime();
    const marketType = this.getMarketTypeOfReserve(reserveId);
    const reserves = this.reserves.get(marketType);
    if (!reserves) throw new Error(`Not found reserves in market: ${marketType}`);
    const reserve = reserves.find(reserve => reserve.id == reserveId);
    if (!reserve) throw new Error(`Not found reserve id ${reserveId}`);
    return this.reserveCalculationOperation.totalSupplyAPYWithNewAvailableSupplyAmount(
      reserve,
      marketType,
      newAvailableAmount,
      currentTimestampMs,
      userAction
    );
  }

  async totalBorrowAPYWithNewBorrowedAmount(
    reserveId: string,
    newAvailableLiquidity: bigint,
    newBorrowedAmount: DecimalFraction,
    userAction: UserActionType
  ): Promise<DecimalJs> {
    const currentTimestampMs = new Date().getTime();
    const marketType = this.getMarketTypeOfReserve(reserveId);
    const reserves = this.reserves.get(marketType);
    if (!reserves) throw new Error(`Not found reserves in market: ${marketType}`);
    const reserve = reserves.find(reserve => reserve.id == reserveId);
    if (!reserve) throw new Error(`Not found reserve id ${reserveId}`);
    return this.reserveCalculationOperation.totalBorrowAPYWithNewBorrowedAmount(
      reserve,
      marketType,
      newAvailableLiquidity,
      newBorrowedAmount,
      currentTimestampMs,
      userAction
    );
  }

  getTotalSuppliedUSDValueObligation(marketType: string): DecimalJs {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return new DecimalJs(0);

    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);

    return this.obligationCalculationOperation.getTotalSuppliedUSDValueObligation(obligation, associateReserve, reserveTokenPrice);
  }

  getTotalBorrowedUSDValueObligation(marketType: string): DecimalJs {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return new DecimalJs(0);

    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);

    return this.obligationCalculationOperation.getTotalBorrowedUSDValueObligation(obligation, associateReserve, reserveTokenPrice);
  }

  getDetailSuppliedOnMarketObligation(marketType: string, reserveIds?: string[]): DetailSuppliedRes[] {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return [];
    const reserves = this.reserves.get(marketType);
    if (!reserves) return [];
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);
    return this.obligationCalculationOperation.getDetailSuppliedOnMarketObligation(
      obligation,
      associateReserve,
      reserveTokenPrice,
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  getDetailBorrowedOnMarketObligation(marketType: string, reserveIds?: string[]): DetailBorrowedRes[] {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return [];
    const reserves = this.reserves.get(marketType);
    if (!reserves) return [];
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);
    return this.obligationCalculationOperation.getDetailBorrowedOnMarketObligation(
      obligation,
      associateReserve,
      reserveTokenPrice,
      reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves
    );
  }

  calculateCurrentHealthRatioObligation(marketType: string): DecimalJs {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return new DecimalJs(0);
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);
    return this.obligationCalculationOperation.calculateCurrentHealthRatioObligation(obligation, associateReserve, reserveTokenPrice);
  }

  calculateRemainingBorrowAmount(borrowReserve: string): DecimalJs {
    const marketType = this.getMarketTypeOfReserve(borrowReserve);
    const obligation = this.obligations.get(marketType);
    if (!obligation) return new DecimalJs(0);
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);

    return this.obligationCalculationOperation.calculateRemainingBorrowAmount(obligation, associateReserve, reserveTokenPrice, borrowReserve);
  }

  calculateAllowedWithdrawAmount(withdrawReserve: string): DecimalJs {
    const marketType = this.getMarketTypeOfReserve(withdrawReserve);
    const obligation = this.obligations.get(marketType);
    if (!obligation) return new DecimalJs(0);
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);

    return this.obligationCalculationOperation.calculateAllowedWithdrawAmount(obligation, associateReserve, reserveTokenPrice, withdrawReserve, true);
  }

  async getTotalIncentiveRewardStatisticObligation(marketType: string, reservesIds?: string[]): Promise<DetailIncentiveRewardRes[]> {
    const obligation = this.obligations.get(marketType);
    if (!obligation) return [];
    const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligation, marketType);
    const reserveMarketType = new Map<string, string>(
      Array.from(associateReserve.keys()).map(reserveId => {
        const marketType = this.getMarketTypeOfReserve(reserveId);
        return [reserveId, marketType];
      })
    );

    return this.rewardCalculationOperation.getTotalIncentiveRewardStatisticObligation(
      obligation,
      associateReserve,
      reserveMarketType,
      reserveTokenPrice,
      reservesIds
    );
  }

  private getAssociateReserveObligationData(
    obligation: Obligation,
    marketType: string
  ): {
    associateReserve: Map<string, Reserve>;
    reserveTokenPrice: Map<string, DecimalJs>;
  } {
    const reserves = this.reserves.get(marketType);
    if (!reserves) throw new Error(`Not found reserves in market: ${marketType}`);
    const associateReserve = new Map<string, Reserve>();
    const reserveTokenPrice = new Map<string, DecimalJs>();

    for (const deposit of obligation.deposits) {
      const reserve = reserves.find(reserve => reserve.id == deposit);
      if (reserve) {
        associateReserve.set(reserve.id, reserve);
        reserveTokenPrice.set(reserve.id, reserve.liquidity.marketPrice.toDecimalJs());
      }
    }

    for (const borrow of obligation.borrows) {
      const reserve = reserves.find(reserve => reserve.id == borrow);
      if (reserve) {
        associateReserve.set(reserve.id, reserve);
        reserveTokenPrice.set(reserve.id, reserve.liquidity.marketPrice.toDecimalJs());
      }
    }

    return {
      associateReserve,
      reserveTokenPrice,
    };
  }

  private getMarketTypeOfReserve(reserveId: string): string {
    for (const [marketId, reserves] of this.reserves.entries()) {
      if (reserves.some(r => r.id === reserveId)) {
        return marketId;
      }
    }
    throw new Error(`Not found reserve market type of reserve id ${reserveId}`);
  }
}
