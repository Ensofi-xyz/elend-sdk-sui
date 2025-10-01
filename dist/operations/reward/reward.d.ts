import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/dist/cjs/transactions';
import { NetworkConfig } from '../../interfaces/config';
import { ClaimRewardOperationArgs, IElendMarketRewardOperation } from '../../interfaces/operations';
export declare class ElendMarketRewardOperation implements IElendMarketRewardOperation {
    private contract;
    private query;
    private networkConfig;
    private pythClient;
    private suiClient;
    constructor(networkConfig: NetworkConfig, suiClient: SuiClient);
    buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction;
}
