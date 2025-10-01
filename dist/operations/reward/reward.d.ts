import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
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
