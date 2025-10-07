import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { ElendMarketConfig, NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import {
  IElendMarketQueryOperation,
  IWithdrawElendMarketOperation,
  WithdrawCTokensAndRedeemLiquidityOperationArgs,
} from '../../interfaces/operations';
import { RewardOption } from '../../types/common';
import { getTokenTypeForReserve } from '../../utils/common';
import { ElendMarketQueryOperation } from '../query/query';
import { refreshReserves } from './common';

export class WithdrawElendMarketOperation implements IWithdrawElendMarketOperation {
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

  async buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Promise<Transaction> {
    const { owner, reserve, collateralAmount, marketType } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
    if (isNil(obligationOwnerCap)) throw new Error('Obligation Not Init');

    const obligationId = obligationOwnerCap.obligation;
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to withdraw');
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    // - Refresh reserves
    const reserves = packageInfo.reserves;
    await refreshReserves(tx, {
      obligationData,
      reserve,
      pythClient: this.pythClient,
      networkConfig: this.networkConfig,
      contract: this.contract,
    });

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

    const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, RewardOption.Deposit);
    for (const rewardConfig of rewardConfigs) {
      const rewardTokenType = rewardConfig.rewardTokenType;
      const userReward = await this.query.fetchUserReward(reserve, rewardTokenType, RewardOption.Deposit, obligationId, owner);
      if (!userReward) {
        this.contract.initUserReward(tx, [marketType, rewardTokenType], {
          version: packageInfo.version.id,
          obligation: obligationId,
          reserve,
          option: RewardOption.Deposit,
          phase: rewardConfig.phase,
        });
      }
    }
    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    if (rewardConfigs.length > 0) {
      this.contract.updateRewardConfig(tx, [marketType, tokenType], {
        version: packageInfo.version.id,
        reserve,
        option: RewardOption.Deposit,
        clock: SUI_SYSTEM_CLOCK,
      });

      this.contract.updateUserReward(tx, [marketType, tokenType], {
        version: packageInfo.version.id,
        obligation: obligationId,
        reserve,
        option: RewardOption.Deposit,
      });
    }

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

  private async handleWithdrawOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      collateralAmount: bigint;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: ElendMarketConfig;
    }
  ): Promise<void> {
    const { owner, reserve, collateralAmount, obligationOwnerCap, obligationId, packageInfo } = args;

    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
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
}
