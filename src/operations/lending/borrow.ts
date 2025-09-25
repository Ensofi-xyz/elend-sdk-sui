import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core/function-loader';
import { ElendMarketConfig, NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { BorrowObligationLiquidityOperationArgs, IBorrowElendMarketOperation, IElendMarketQueryOperation } from '../../interfaces/operations';
import { getTokenTypeForReserve } from '../../utils/common';
import { ElendMarketQueryOperation } from '../query/query';
import { refreshReserves } from './common';

export class BorrowElendMarketOperation implements IBorrowElendMarketOperation {
  private contract: IElendMarketContract;
  private query: IElendMarketQueryOperation;
  private networkConfig: NetworkConfig;
  private pythClient: SuiPythClient;
  private suiClient: SuiClient;

  constructor(networkConfig: NetworkConfig, suiClient: SuiClient) {
    this.contract = new ElendMarketContract(networkConfig);
    this.query = new ElendMarketQueryOperation(suiClient, networkConfig);
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

    const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner);

    if (isNil(obligationOwnerCap)) {
      throw new Error('Must Init Obligation First');
    }
    const obligationId = obligationOwnerCap.obligation;
    const obligationData = await this.query.fetchObligation(obligationId);
    if (isNil(obligationData)) throw Error('Not found obligation to deposit');

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

    await this.handleBorrowOperation(tx, {
      owner,
      reserve,
      liquidityAmount: amount,
      obligationId,
      obligationOwnerCap: obligationOwnerCap.id,
      packageInfo,
    });

    return tx;
  }

  private async handleBorrowOperation(
    tx: Transaction,
    args: {
      owner: string;
      reserve: string;
      liquidityAmount: number;
      obligationOwnerCap: string;
      obligationId: string;
      packageInfo: ElendMarketConfig;
    }
  ): Promise<void> {
    const { owner, reserve, liquidityAmount, obligationOwnerCap, obligationId, packageInfo } = args;

    const tokenType = getTokenTypeForReserve(reserve, packageInfo);
    if (!tokenType) {
      throw new Error(`Token type not found for reserve: ${reserve}`);
    }

    let borrowCoin = this.contract.borrowObligationLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
      obligationOwnerCap: obligationOwnerCap,
      version: packageInfo.version.id,
      reserve,
      obligation: obligationId,
      liquidityAmount: BigInt(liquidityAmount),
      clock: SUI_SYSTEM_CLOCK,
    });

    tx.transferObjects([borrowCoin], owner);
  }
}
