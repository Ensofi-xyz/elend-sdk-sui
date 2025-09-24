import { isNil } from 'lodash';

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { SUI_SYSTEM_CLOCK } from '../../common/constant';
import { ElendMarketContract } from '../../core';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import {
  DepositReserveLiquidityAndObligationCollateralOperationArgs,
  IDepositElendMarketOperation,
  InitObligationArgs,
} from '../../interfaces/operations';
import { ObligationOwnerCap } from '../../types/object';

export class DepositElendMarketOperation implements IDepositElendMarketOperation {
  private contract: IElendMarketContract;
  private networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig) {
    this.contract = new ElendMarketContract(networkConfig);
    this.networkConfig = networkConfig;
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

    // TODO: Continue with the rest of the deposit flow
    // - Refresh reserves

    // - Refresh obligation
    this.contract.refreshObligation(
      tx,
      [
        packageInfo.marketType['MAIN_POOL'],
        'Reserve T1', // TODO update
        'Reserve T2', // TODO update
        'Reserve T3', // TODO update
      ],
      {
        version: packageInfo.version.id,
        obligation: obligationId,
        reserveT1: 'reserveT1', // TODO update
        reserveT2: 'reserveT2', // TODO update
        reserveT3: 'reserveT3', // TODO update
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
