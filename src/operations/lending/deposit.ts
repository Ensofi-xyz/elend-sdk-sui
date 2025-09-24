import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';

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

  constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.contract = new ElendMarketContract(networkConfig);
    this.query = new ElendMarketQueryOperation(suiClient);
    this.networkConfig = networkConfig;
    this.pythClient = new SuiPythClient(
      suiClient,
      networkConfig.packages[networkConfig.latestVersion].pythState,
      networkConfig.packages[networkConfig.latestVersion].wormholeState
    );
  }

  async buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction> {
    const { owner, suiClient } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.getObligationOwnerCapObject(suiClient, owner);
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
    const { amount, owner, reserve, suiClient } = args;
    const tx = new Transaction();

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${packageInfo.marketType['MAIN_POOL']}>`;
    const response = await suiClient.getOwnedObjects({
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
    for (const reserveToRefresh of reservesToRefresh) {
      const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
      if (isNil(pythPriceFeedId)) throw Error('Not found pyth price feed id of associate reserves');

      const priceUpdateData = await pythConnection.getPriceFeedsUpdateData([pythPriceFeedId]);
      const priceInfoObjects = await this.pythClient.updatePriceFeeds(tx, priceUpdateData, [pythPriceFeedId]);

      let tokenType = Object.keys(reserves).find(tokenType => reserves[tokenType].id == reserveToRefresh);
      if (isNil(tokenType)) throw Error('not found token type of associate reserves');

      this.contract.refreshReserve(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
        version: packageInfo.version.id,
        reserve: reserveToRefresh,
        priceInfoObject: priceInfoObjects[0],
        clock: SUI_SYSTEM_CLOCK,
      });
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

    return tx;
  }

  private async getObligationOwnerCapObject(suiClient: SuiClient, owner: string): Promise<ObligationOwnerCap> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${packageInfo.marketType['MAIN_POOL']}>`;
    const response = await suiClient.getOwnedObjects({
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
}
