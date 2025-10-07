import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { NetworkConfig } from '../../interfaces/config';
import { IRepayElendMarketOperation, RepayObligationLiquidityOperationArgs } from '../../interfaces/operations';
export declare class RepayElendMarketOperation implements IRepayElendMarketOperation {
    private contract;
    private query;
    private networkConfig;
    private pythClient;
    private suiClient;
    private readonly ABSILON;
    private readonly ESTIMATE_GAS;
    constructor(networkConfig: NetworkConfig, suiClient: SuiClient);
    buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Promise<Transaction>;
    private handleRepayOperation;
}
