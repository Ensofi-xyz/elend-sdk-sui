import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { NetworkConfig } from '../../interfaces/config';
import { IWithdrawElendMarketOperation, WithdrawCTokensAndRedeemLiquidityOperationArgs } from '../../interfaces/operations';
export declare class WithdrawElendMarketOperation implements IWithdrawElendMarketOperation {
    private contract;
    private query;
    private networkConfig;
    private pythClient;
    private suiClient;
    constructor(networkConfig: NetworkConfig, suiClient: SuiClient);
    buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Promise<Transaction>;
    private handleWithdrawOperation;
}
