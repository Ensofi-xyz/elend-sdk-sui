import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { SuiPythClient } from '@pythnetwork/pyth-sui-js';

import { ElendMarketContract } from '../../core';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { IElendMarketQueryOperation, IRepayElendMarketOperation, RepayObligationLiquidityOperationArgs } from '../../interfaces/operations';
import { ElendMarketQueryOperation } from '../query/query';

export class RepayElendMarketOperation implements IRepayElendMarketOperation {
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

  buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
