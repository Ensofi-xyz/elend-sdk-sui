import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { ClaimRewardOperationArgs, IElendMarketQueryOperation, IElendMarketRewardOperation } from '../../interfaces/operations';
import { add0xPrefix, getTokenTypeForReserve } from '../../utils';
import { refreshReserves } from '../lending/common';
import { ElendMarketQueryOperation } from '../query/query';

export class ElendMarketRewardOperation implements IElendMarketRewardOperation {
  private contract: IElendMarketContract;
  private query: IElendMarketQueryOperation;
  private networkConfig: NetworkConfig;
  private pythClient: SuiPythClient;
  private suiClient: SuiClient;

  constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.contract = new ElendMarketContract(networkConfig);
    this.query = new ElendMarketQueryOperation(networkConfig, suiClient);
    this.networkConfig = networkConfig;
    this.pythClient = new SuiPythClient(
      suiClient,
      networkConfig.packages[networkConfig.latestVersion].pythState,
      networkConfig.packages[networkConfig.latestVersion].wormholeState
    );
    this.suiClient = suiClient;
  }

  async buildClaimRewardTxn(args: ClaimRewardOperationArgs): Promise<Transaction> {
    const { owner, reserve, marketType, option } = args;
    const tx = new Transaction();

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
    if (isNil(obligationOwnerCap)) {
      throw new Error('Must Init Obligation First');
    }
    const obligationId = obligationOwnerCap.obligation;
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to deposit');
    // - Refresh reserves
    const reserves = packageInfo.reserves;

    const priceFeedObjectReserveDeposit = await refreshReserves(tx, {
      obligationData,
      reserve,
      pythClient: this.pythClient,
      networkConfig: this.networkConfig,
      contract: this.contract,
    });

    // - Refresh obligation
    this.contract.refreshObligation(tx, [marketType, Object.keys(reserves)[0], Object.keys(reserves)[1], Object.keys(reserves)[2]], {
      version: packageInfo.version.id,
      obligation: obligationId,
      reserveT1: reserves[Object.keys(reserves)[0]].id,
      reserveT2: reserves[Object.keys(reserves)[1]].id,
      reserveT3: reserves[Object.keys(reserves)[2]].id,
      clock: SUI_SYSTEM_CLOCK,
    });

    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    this.contract.updateRewardConfig(tx, [marketType, tokenType], {
      version: packageInfo.version.id,
      reserve,
      option: option,
      clock: SUI_SYSTEM_CLOCK,
    });

    this.contract.updateUserReward(tx, [marketType, tokenType], {
      version: packageInfo.version.id,
      obligation: obligationId,
      reserve,
      option: option,
    });

    const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, option);
    for (const rewardConfig of rewardConfigs) {
      this.contract.claimReward(tx, [marketType, add0xPrefix(rewardConfig.rewardTokenType)], {
        version: packageInfo.version.id,
        tokenRewardState: packageInfo.tokenRewardState.id,
        obligation: obligationId,
        reserve,
        option,
      });
    }

    return tx;
  }
}
