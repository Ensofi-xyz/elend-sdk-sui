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
import { MarketClientRes, ReserveClientRes } from './types/client';
import { Network } from './types/common';
import { Market, Obligation, Reserve } from './types/object';
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

  private readonly rewardOperation: IElendMarketRewardOperation;
  private readonly queryOperation: IElendMarketQueryOperation;

  private readonly reserveCalculationOperation: IElendMarketReserveCalculationOperation;
  private readonly obligationCalculationOperation: IElendMarketObligationCalculationOperation;
  private readonly rewardCalculationOperation: IElendMarketRewardCalculationOperation;

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
    this.queryOperation = new ElendMarketQueryOperation(networkConfig, suiClient);

    this.reserveCalculationOperation = new ElendMarketReserveCalculationOperation();
    this.obligationCalculationOperation = new ElendMarketObligationCalculationOperation();
    this.rewardCalculationOperation = new ElendMarketRewardCalculationOperation();
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

  getReserves(marketTypeInput?: string): Map<string, ReserveClientRes[]> {
    if (this.reserves.size == 0) {
      this.loadReserves();
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

  async deposit(reserve: string, marketType: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.depositOperation.buildDepositTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
      marketType,
    });
  }

  async borrow(reserve: string, marketType: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.borrowOperation.buildBorrowTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
      marketType,
    });
  }

  async withdraw(reserve: string, marketType: string, collateralAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.withdrawOperation.buildWithdrawTxn({
      owner: this.obligationOwner,
      reserve,
      collateralAmount,
      marketType,
    });
  }

  async repay(reserve: string, marketType: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.repayOperation.buildRepayTxn({
      amount: liquidityAmount,
      owner: this.obligationOwner,
      reserve,
      marketType,
    });
  }

  async claim_reward(reserve: string, marketType: string, option: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.rewardOperation.buildClaimRewardTxn({
      owner: this.obligationOwner,
      reserve,
      marketType,
      option,
    });
  }
}
