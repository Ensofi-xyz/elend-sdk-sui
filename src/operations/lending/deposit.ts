import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { ElendMarketConfig, NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import {
  DepositReserveLiquidityAndObligationCollateralOperationArgs,
  IDepositElendMarketOperation,
  IElendMarketQueryOperation,
  InitObligationArgs,
} from '../../interfaces/operations';
import { RewardOption } from '../../types/common';
import { getTokenTypeForReserve } from '../../utils/common';
import { splitCoin } from '../../utils/split-coin';
import { ElendMarketQueryOperation } from '../query/query';
import { refreshReserves } from './common';

export class DepositElendMarketOperation implements IDepositElendMarketOperation {
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

  async buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction> {
    const { owner, marketType } = args;
    const tx = new Transaction();

    const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
    if (!isNil(obligationOwnerCap)) throw new Error('Obligation Already Init');

    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const market = packageInfo.lendingMarkets[marketType];
    const obligationOwnerCapResult = this.contract.initObligation(tx, packageInfo.marketType['MAIN_POOL'], {
      version: packageInfo.version.id,
      market: market.id,
      owner,
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([obligationOwnerCapResult], owner);

    return tx;
  }

  async buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction> {
    const { amount, owner, reserve, marketType } = args;
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

    // - Handle deposit operation
    await this.handleDepositOperation(tx, {
      owner,
      reserve,
      amount,
      obligationOwnerCap: obligationOwnerCap.id,
      obligationId,
      packageInfo,
      priceFeedObjectReserveDeposit,
    });

    return tx;
  }

  private async handleDepositOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      amount: number;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: ElendMarketConfig;
      priceFeedObjectReserveDeposit: ObjectId;
    }
  ): Promise<void> {
    const { owner, reserve, amount, obligationOwnerCap, obligationId, packageInfo, priceFeedObjectReserveDeposit } = args;

    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    const depositCoin = await splitCoin(this.suiClient, tx, owner, tokenType, [amount]);

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
}
