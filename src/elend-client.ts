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
import { Network } from './types/common';
import { Market, Obligation, Reserve } from './types/object';
import { getSuiClientInstance } from './utils/sui-client';

export class ElendClient {
  public readonly networkConfig: NetworkConfig;
  public readonly suiClient: SuiClient;

  public markets: Market[];
  public obligationOwner: string | null;
  public obligation: Obligation | null;
  public reserves: Map<string, Reserve>;

  private readonly depositOperation: IDepositElendMarketOperation;
  private readonly borrowOperation: IBorrowElendMarketOperation;
  private readonly withdrawOperation: IWithdrawElendMarketOperation;
  private readonly repayOperation: IRepayElendMarketOperation;

  private readonly rewardOperation: IElendMarketRewardOperation;
  private readonly queryOperation: IElendMarketQueryOperation;

  private readonly reserveCalculationOperation: IElendMarketReserveCalculationOperation;
  private readonly obligationCalculationOperation: IElendMarketObligationCalculationOperation;
  private readonly rewardCalculationOperation: IElendMarketRewardCalculationOperation;

  private constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.networkConfig = networkConfig;
    this.suiClient = suiClient;

    this.markets = [];
    this.obligationOwner = null;
    this.obligation = null;
    this.reserves = new Map<string, Reserve>();

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
      obligationOwner?: string;
      suiClient?: SuiClient;
      isLoadReserves: boolean;
    }
  ): Promise<ElendClient> {
    const networkConfig = ConfigLoader.loadNetworkConfig(network);
    const suiClient = isNil(options?.suiClient) ? getSuiClientInstance(networkConfig.rpcUrl, networkConfig.wsRpcUrl) : options.suiClient;
    const elendClient = new ElendClient(networkConfig, suiClient);

    if (!isNil(options?.obligationOwner)) {
      await elendClient.loadObligation(options.obligationOwner);
    }

    if (!isNil(options?.isLoadReserves) && options.isLoadReserves) {
      await elendClient.loadReserves();
    }

    return elendClient;
  }

  async loadObligation(obligationOwner: string): Promise<void> {
    this.obligationOwner = obligationOwner;
    const obligationOwnerCap = await this.queryOperation.fetchObligationOwnerCapObject(obligationOwner);
    if (isNil(obligationOwnerCap)) return;
    const obligationId = obligationOwnerCap.obligation;
    const obligation = await this.queryOperation.fetchObligation(obligationId);
    this.obligation = obligation;
  }

  async loadReserves() {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
    for (const [tokenType, reserveConfigObject] of Object.entries(packageInfo.reserves)) {
      const reserve = await this.queryOperation.fetchReserve(reserveConfigObject.id);
      if (isNil(reserve)) continue;
      this.reserves.set(tokenType, reserve);
    }
  }

  async reloadObligation(): Promise<void> {
    if (isNil(this.obligationOwner)) {
      throw Error('Not load obligation owner yet');
    }
    const obligationOwnerCap = await this.queryOperation.fetchObligationOwnerCapObject(this.obligationOwner);
    if (isNil(obligationOwnerCap)) return;
    const obligationId = obligationOwnerCap.obligation;
    const obligation = await this.queryOperation.fetchObligation(obligationId);
    this.obligation = obligation;
  }

  async reloadReserves(): Promise<void> {
    await this.loadReserves();
  }

  async initObligation(): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Not load obligation owner yet');
    }

    return this.depositOperation.buildInitObligationTxn({
      owner: this.obligationOwner,
    });
  }

  async deposit(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.depositOperation.buildDepositTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
    });
  }

  async borrow(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.borrowOperation.buildBorrowTxn({
      owner: this.obligationOwner,
      reserve,
      amount: liquidityAmount,
    });
  }

  async withdraw(reserve: string, collateralAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    return this.withdrawOperation.buildWithdrawTxn({
      owner: this.obligationOwner,
      reserve,
      collateralAmount,
    });
  }

  async repay(reserve: string, liquidityAmount: number): Promise<Transaction> {
    if (isNil(this.obligationOwner)) {
      throw Error('Have not load obligation owner yet');
    }

    const obligationOwnerCap = await this.queryOperation.fetchObligationOwnerCapObject(this.obligationOwner);
    if (isNil(obligationOwnerCap)) {
      throw Error('Have not init obligation yet');
    }

    return this.repayOperation.buildRepayTxn({});
  }
}
