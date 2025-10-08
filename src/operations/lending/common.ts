import { isNil } from 'lodash';

import { Transaction } from '@mysten/sui/transactions';

import { SuiPriceServiceConnection, SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { Obligation } from '../../types/object';

export const refreshReserves = async (
  tx: Transaction,
  args: {
    obligationData: Obligation | null;
    reserve: string;
    pythClient: SuiPythClient;
    networkConfig: NetworkConfig;
    contract: IElendMarketContract;
  }
): Promise<ObjectId> => {
  const { obligationData, reserve, networkConfig, pythClient, contract } = args;
  const packageInfo = networkConfig.packages[networkConfig.latestVersion];

  const reservesToRefresh = !isNil(obligationData) 
    ? new Set<string>([...obligationData.deposits, ...obligationData.borrows])
    : new Set<string>();
  reservesToRefresh.add(reserve);

  const reserves = packageInfo.reserves;
  const pythPriceFeedIds = packageInfo.pythPriceFeedId;
  const reservePythPriceFeedIds = new Map<string, string>();

  for (const [tokenType, reserve] of Object.entries(reserves)) {
    (this, reservePythPriceFeedIds.set(reserve.id, pythPriceFeedIds[tokenType]));
  }

  const pythConnection = new SuiPriceServiceConnection(networkConfig.pythHermesUrl);
  const priceFeedIdsNeedUpdate: string[] = [];
  for (const reserveToRefresh of reservesToRefresh) {
    const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
    if (isNil(pythPriceFeedId)) throw Error('Not found pyth price feed id of associate reserves');

    priceFeedIdsNeedUpdate.push(pythPriceFeedId);
  }

  let priceFeedObjectReserve: ObjectId | null = null;
  if (priceFeedIdsNeedUpdate.length === Array.from(reservesToRefresh).length) {
    const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceFeedIdsNeedUpdate);
    const priceInfoObjects = await pythClient.updatePriceFeeds(tx, priceUpdateData, priceFeedIdsNeedUpdate);

    for (let i = 0; i < Array.from(reservesToRefresh).length; i++) {
      const reserveToRefresh = Array.from(reservesToRefresh)[i];
      if (reserveToRefresh == reserve) {
        priceFeedObjectReserve = priceInfoObjects[i];
      }
      let tokenType = Object.keys(reserves).find(tokenType => reserves[tokenType].id == reserveToRefresh);
      if (isNil(tokenType)) throw Error('not found token type of associate reserves');

      contract.refreshReserve(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
        version: packageInfo.version.id,
        reserve: reserveToRefresh,
        priceInfoObject: priceInfoObjects[i],
        clock: SUI_SYSTEM_CLOCK,
      });
    }
  } else {
    throw Error('Can not get price update for reserve');
  }

  if (priceFeedObjectReserve === null) {
    throw Error('Failed to assign priceFeedObjectReserve');
  }

  return priceFeedObjectReserve;
};
