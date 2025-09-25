import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import {
  DepositReserveLiquidityAndObligationCollateralOperationArgs,
  IDepositElendMarketOperation,
  IElendMarketQueryOperation,
  InitObligationArgs,
} from '../../interfaces/operations';
import { ObligationOwnerCap } from '../../types/object';
import { ElendMarketQueryOperation } from '../query/query';

export class DepositElendMarketOperation implements IDepositElendMarketOperation {
  private contract: IElendMarketContract;
  private query: IElendMarketQueryOperation;
  private networkConfig: NetworkConfig;
  private pythClient: SuiPythClient;
  private suiClient: SuiClient;

  constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.contract = new ElendMarketContract(networkConfig);
    this.query = new ElendMarketQueryOperation(suiClient);
    this.networkConfig = networkConfig;
    this.pythClient = new SuiPythClient(
      suiClient,
      networkConfig.packages[networkConfig.latestVersion].pythState,
      networkConfig.packages[networkConfig.latestVersion].wormholeState
    );
    this.suiClient = suiClient;
  }

  async buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction> {
    const { owner } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.getObligationOwnerCapObject(owner);
    if (!isNil(obligationOwnerCap)) throw new Error('Obligation Already Init');

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapResult = this.contract.initObligation(tx, packageInfo.marketType['MAIN_POOL'], {
      version: packageInfo.version.id,
      owner,
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([obligationOwnerCapResult], owner);

    return tx;
  }

  async buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction> {
    const { amount, owner, reserve } = args;
    const tx = new Transaction();

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${packageInfo.marketType['MAIN_POOL']}>`;
    const response = await this.suiClient.getOwnedObjects({
      owner: owner,
      options: {
        showContent: true,
      },
      filter: {
        StructType: obligationOwnerCapStructType,
      },
    });

    const obligationOwnerCap = response.data[0] as ObligationOwnerCap;
    if (isNil(obligationOwnerCap)) {
      throw new Error('Must Init Obligation First');
    }
    const obligationId = obligationOwnerCap.obligation;

    // TODO - get reward config

    // - Refresh reserves
    const reserves = packageInfo.reserves;
    const pythPriceFeedIds = packageInfo.pythPriceFeedId;
    const reservePythPriceFeedIds = new Map<string, string>();

    for (const [tokenType, reserve] of Object.entries(reserves)) {
      (this, reservePythPriceFeedIds.set(reserve.id, pythPriceFeedIds[tokenType]));
    }

    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to deposit');
    const reservesToRefresh = [];
    reservesToRefresh.push(...obligationData.deposits);
    reservesToRefresh.push(...obligationData.borrows);

    const pythConnection = new SuiPriceServiceConnection(this.networkConfig.pythHermesUrl);
    const priceFeedIdsNeedUpdate: string[] = [];
    for (const reserveToRefresh of reservesToRefresh) {
      const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
      if (isNil(pythPriceFeedId)) throw Error('Not found pyth price feed id of associate reserves');

      priceFeedIdsNeedUpdate.push(pythPriceFeedId);
    }

    let priceFeedObjectReserveDeposit: ObjectId;
    if (priceFeedIdsNeedUpdate.length === reservesToRefresh.length) {
      const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceFeedIdsNeedUpdate);
      const priceInfoObjects = await this.pythClient.updatePriceFeeds(tx, priceUpdateData, priceFeedIdsNeedUpdate);

      for (let i = 0; i < reservesToRefresh.length; i++) {
        const reserveToRefresh = reservesToRefresh[i];
        if (reserveToRefresh === reserve) {
          priceFeedObjectReserveDeposit = priceInfoObjects[i];
        }
        let tokenType = Object.keys(reserves).find(tokenType => reserves[tokenType].id == reserveToRefresh);
        if (isNil(tokenType)) throw Error('not found token type of associate reserves');

        this.contract.refreshReserve(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
          version: packageInfo.version.id,
          reserve: reserveToRefresh,
          priceInfoObject: priceInfoObjects[i],
          clock: SUI_SYSTEM_CLOCK,
        });
      }
    } else {
      throw Error('Can not get price update for reserve');
    }

    // - Refresh obligation
    this.contract.refreshObligation(
      tx,
      [packageInfo.marketType['MAIN_POOL'], Object.keys(reserves)[0], Object.keys(reserves)[1], Object.keys(reserves)[2]],
      {
        version: packageInfo.version.id,
        obligation: obligationId,
        reserveT1: reserves[Object.keys(reserves)[0]].id,
        reserveT2: reserves[Object.keys(reserves)[1]].id,
        reserveT3: reserves[Object.keys(reserves)[2]].id,
        clock: SUI_SYSTEM_CLOCK,
      }
    );

    // - Handle deposit operation
    await this.handleDepositOperation(tx, {
      owner,
      reserve,
      amount,
      obligationOwnerCap: obligationOwnerCap.id,
      obligationId,
      packageInfo,
      priceFeedObjectReserveDeposit: priceFeedObjectReserveDeposit!,
    });

    return tx;
  }

  private async getObligationOwnerCapObject(owner: string): Promise<ObligationOwnerCap> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${packageInfo.marketType['MAIN_POOL']}>`;
    const response = await this.suiClient.getOwnedObjects({
      owner: owner,
      options: {
        showContent: true,
      },
      filter: {
        StructType: obligationOwnerCapStructType,
      },
    });

    return response.data[0] as ObligationOwnerCap;
  }

  private async handleDepositOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      amount: number;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: any;
      priceFeedObjectReserveDeposit: ObjectId;
    }
  ): Promise<void> {
    const { owner, reserve, amount, obligationOwnerCap, obligationId, packageInfo, priceFeedObjectReserveDeposit } = args;

    const tokenType = this.getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    const depositCoin = await this.splitCoinForDeposit(tx, {
      owner,
      tokenType,
      amount,
    });

    const cToken = this.contract.depositReserveLiquidityAndMintCTokens(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      version: packageInfo.version.id,
      reserve: reserve,
      coin: depositCoin,
      priceInfoObject: priceFeedObjectReserveDeposit,
      clock: SUI_SYSTEM_CLOCK,
    });

    this.contract.depositCTokensIntoObligation(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      obligationOwnerCap: obligationOwnerCap,
      version: packageInfo.version.id,
      reserve: reserve,
      obligation: obligationId,
      cToken: cToken,
      clock: SUI_SYSTEM_CLOCK,
    });
  }

  private getTokenTypeForReserve(reserveId: string, packageInfo: any): string | null {
    const reserves = packageInfo.reserves;
    for (const [tokenType, reserveInfo] of Object.entries(reserves)) {
      if ((reserveInfo as any).id === reserveId) {
        return tokenType;
      }
    }
    return null;
  }

  private async splitCoinForDeposit(
    tx: Transaction,
    args: {
      owner: string;
      tokenType: string;
      amount: number;
    }
  ): Promise<any> {
    const { owner, tokenType, amount } = args;

    const coinsResponse = await this.suiClient.getCoins({
      owner: owner,
      coinType: tokenType,
    });

    if (coinsResponse.data.length === 0) {
      throw new Error(`No coins found for token type: ${tokenType}`);
    }

    const totalBalance = coinsResponse.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);

    if (totalBalance < BigInt(amount)) {
      throw new Error(`Insufficient balance. Required: ${amount}, Available: ${totalBalance}`);
    }

    const largeCoin = coinsResponse.data.find(coin => BigInt(coin.balance) >= BigInt(amount));

    if (largeCoin) {
      if (BigInt(largeCoin.balance) === BigInt(amount)) {
        return tx.object(largeCoin.coinObjectId);
      } else {
        const [splitCoin] = tx.splitCoins(tx.object(largeCoin.coinObjectId), [amount]);
        return splitCoin;
      }
    } else {
      const primaryCoin = coinsResponse.data[0];
      const coinsToMerge = coinsResponse.data.slice(1).map(coin => tx.object(coin.coinObjectId));

      if (coinsToMerge.length > 0) {
        tx.mergeCoins(tx.object(primaryCoin.coinObjectId), coinsToMerge);
      }

      const [splitCoin] = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [amount]);
      return splitCoin;
    }
  }
}
