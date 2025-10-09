import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { NetworkConfig } from '../../interfaces/config';
import { BorrowObligationLiquidityOperationArgs, IBorrowElendMarketOperation } from '../../interfaces/operations';
export declare class BorrowElendMarketOperation implements IBorrowElendMarketOperation {
    private contract;
    private query;
    private networkConfig;
    private pythClient;
    private suiClient;
    constructor(networkConfig: NetworkConfig, suiClient: SuiClient);
    buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Promise<Transaction>;
    private handleBorrowOperation;
}
