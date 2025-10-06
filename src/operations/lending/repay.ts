import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { ElendMarketConfig, NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { IElendMarketQueryOperation, IRepayElendMarketOperation, RepayObligationLiquidityOperationArgs } from '../../interfaces/operations';
import { RewardOption } from '../../types/common';
import { getTokenTypeForReserve, splitCoin, U64_MAX } from '../../utils';
import { ElendMarketQueryOperation } from '../query/query';
import { refreshReserves } from './common';

export class RepayElendMarketOperation implements IRepayElendMarketOperation {
  private contract: IElendMarketContract;
  private query: IElendMarketQueryOperation;
  private networkConfig: NetworkConfig;
  private pythClient: SuiPythClient;
  private suiClient: SuiClient;

  private readonly ABSILON = 0.3;

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

  async buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Promise<Transaction> {
    const { owner, reserve, amount, decimals, marketType } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
    if (isNil(obligationOwnerCap)) {
      throw new Error('Must Init Obligation First');
    }
    const obligationId = obligationOwnerCap.obligation;
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to repay');

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
    const reserves = packageInfo.reserves;

    await refreshReserves(tx, {
      obligationData,
      reserve,
      pythClient: this.pythClient,
      networkConfig: this.networkConfig,
      contract: this.contract,
    });

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

    const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, RewardOption.Borrow);
    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    if (rewardConfigs.length > 0) {
      this.contract.updateRewardConfig(tx, [marketType, tokenType], {
        version: packageInfo.version.id,
        reserve,
        option: RewardOption.Borrow,
        clock: SUI_SYSTEM_CLOCK,
      });

      this.contract.updateUserReward(tx, [marketType, tokenType], {
        version: packageInfo.version.id,
        obligation: obligationId,
        reserve,
        option: RewardOption.Borrow,
      });
    }

    await this.handleRepayOperation(tx, {
      owner,
      reserve,
      amount,
      decimals,
      obligationOwnerCap: obligationOwnerCap.id,
      obligationId,
      packageInfo,
    });

    return tx;
  }

  private async handleRepayOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      amount: bigint;
      decimals: number;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: ElendMarketConfig;
    }
  ): Promise<void> {
    const { owner, reserve, decimals, obligationOwnerCap, obligationId, packageInfo } = args;

    let { amount } = args;

    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    const totalAmount = await this.suiClient.getBalance({
      owner,
      coinType: tokenType,
    });
    console.log('🚀 ~ RepayElendMarketOperation ~ handleRepayOperation ~ totalAmount:', totalAmount);
    let repayCoin;
    if (amount == U64_MAX) {
      if (tokenType == '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI') {
        repayCoin = tx.splitCoins(tx.gas, [Number(totalAmount.totalBalance)]);
      } else {
        repayCoin = await splitCoin(this.suiClient, tx, owner, tokenType, [Number(totalAmount.totalBalance)]);
      }
    } else {
      if (tokenType == '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI') {
        repayCoin = tx.splitCoins(tx.gas, [Number(amount) + (this.ABSILON * Math.pow(10, decimals))]);
      } else {
        repayCoin = await splitCoin(this.suiClient, tx, owner, tokenType, [Number(amount) + (this.ABSILON * Math.pow(10, decimals))]);
      }
    }

    this.contract.repayObligationLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      version: packageInfo.version.id,
      reserve: reserve,
      obligation: obligationId,
      obligationOwnerCap: obligationOwnerCap,
      repayCoin,
      repayAmount: BigInt(amount),
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([repayCoin], owner);
  }
}
