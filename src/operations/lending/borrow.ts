import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core/function-loader';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { BorrowObligationLiquidityOperationArgs, IBorrowElendMarketOperation, IElendMarketQueryOperation } from '../../interfaces/operations';
import { ObligationOwnerCap } from '../../types/object';
import { getTokenTypeForReserve } from '../../utils/common';
import { ElendMarketQueryOperation } from '../query/query';

export class BorrowElendMarketOperation implements IBorrowElendMarketOperation {
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

  async buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Promise<Transaction> {
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
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to deposit');
    const reservesToRefresh = new Set<string>([...obligationData.deposits, ...obligationData.borrows]);
    reservesToRefresh.add(reserve);

    const reserves = packageInfo.reserves;
    const pythPriceFeedIds = packageInfo.pythPriceFeedId;
    const reservePythPriceFeedIds = new Map<string, string>();

    for (const [tokenType, reserve] of Object.entries(reserves)) {
      (this, reservePythPriceFeedIds.set(reserve.id, pythPriceFeedIds[tokenType]));
    }

    const pythConnection = new SuiPriceServiceConnection(this.networkConfig.pythHermesUrl);
    const priceFeedIdsNeedUpdate: string[] = [];
    for (const reserveToRefresh of reservesToRefresh) {
      const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
      if (isNil(pythPriceFeedId)) throw Error('Not found pyth price feed id of associate reserves');

      priceFeedIdsNeedUpdate.push(pythPriceFeedId);
    }

    let priceFeedObjectReserveDeposit: ObjectId;
    if (priceFeedIdsNeedUpdate.length === Array.from(reservesToRefresh).length) {
      const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceFeedIdsNeedUpdate);
      const priceInfoObjects = await this.pythClient.updatePriceFeeds(tx, priceUpdateData, priceFeedIdsNeedUpdate);

      for (let i = 0; i < Array.from(reservesToRefresh).length; i++) {
        const reserveToRefresh = Array.from(reservesToRefresh)[i];
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

    const tokenType = getTokenTypeForReserve(reserve, this.networkConfig);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    let borrowCoin = this.contract.borrowObligationLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      obligationOwnerCap: obligationOwnerCap.id,
      version: packageInfo.version.id,
      reserve,
      obligation: obligationId,
      liquidityAmount: BigInt(amount),
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([borrowCoin], owner);

    return tx;
  }
}
