import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { ElendMarketConfig, NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import {
  IElendMarketQueryOperation,
  IWithdrawElendMarketOperation,
  WithdrawCTokensAndRedeemLiquidityOperationArgs,
} from '../../interfaces/operations';
import { ObligationOwnerCap } from '../../types/object';
import { ElendMarketQueryOperation } from '../query/query';

export class WithdrawElendMarketOperation implements IWithdrawElendMarketOperation {
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

  async buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Promise<Transaction> {
    const { owner, reserve, collateralAmount } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.getObligationOwnerCapObject(owner);
    if (isNil(obligationOwnerCap)) throw new Error('Obligation Not Init');

    const obligationId = obligationOwnerCap.obligation;
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    // - Refresh reserves
    const reserves = packageInfo.reserves;
    const pythPriceFeedIds = packageInfo.pythPriceFeedId;
    const reservePythPriceFeedIds = new Map<string, string>();

    for (const [tokenType, reserve] of Object.entries(reserves)) {
      reservePythPriceFeedIds.set(reserve.id, pythPriceFeedIds[tokenType]);
    }
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to deposit');
    const reservesToRefresh: Set<string> = new Set();
    reservesToRefresh.add(reserve);
    obligationData.deposits.forEach(d => reservesToRefresh.add(d));
    obligationData.borrows.forEach(b => reservesToRefresh.add(b));

    const pythConnection = new SuiPriceServiceConnection(this.networkConfig.pythHermesUrl);
    const priceFeedIdsNeedUpdate: string[] = [];
    for (const reserveToRefresh of reservesToRefresh) {
      const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
      if (isNil(pythPriceFeedId)) throw Error('Not found pyth price feed id of associate reserves');

      priceFeedIdsNeedUpdate.push(pythPriceFeedId);
    }

    let priceFeedObjectReserveDeposit: ObjectId;
    if (priceFeedIdsNeedUpdate.length === reservesToRefresh.size) {
      const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceFeedIdsNeedUpdate);
      const priceInfoObjects = await this.pythClient.updatePriceFeeds(tx, priceUpdateData, priceFeedIdsNeedUpdate);
      const reservesToRefreshArr = Array.from(reservesToRefresh);

      for (let i = 0; i < reservesToRefreshArr.length; i++) {
        const reserveToRefresh = reservesToRefreshArr[i];
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

    // - handle withdraw operation
    await this.handleWithdrawOperation(tx, {
      collateralAmount,
      obligationId,
      obligationOwnerCap: obligationOwnerCap.id,
      owner,
      packageInfo,
      reserve,
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

  private async handleWithdrawOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      collateralAmount: number;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: ElendMarketConfig;
    }
  ): Promise<void> {
    const { owner, reserve, collateralAmount, obligationOwnerCap, obligationId, packageInfo } = args;

    const tokenType = this.getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    const coin = this.contract.withdrawCTokensAndRedeemLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      version: packageInfo.version.id,
      reserve: reserve,
      obligation: obligationId,
      obligationOwnerCap: obligationOwnerCap,
      collateralAmount: BigInt(collateralAmount),
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([coin], owner);
  }

  private getTokenTypeForReserve(reserveId: string, packageInfo: ElendMarketConfig): string | null {
    const reserves = packageInfo.reserves;
    for (const [tokenType, reserveInfo] of Object.entries(reserves)) {
      if ((reserveInfo as any).id === reserveId) {
        return tokenType;
      }
    }
    return null;
  }
}
