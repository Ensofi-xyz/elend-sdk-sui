import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { NetworkConfig } from '../../interfaces/config';
import { DepositReserveLiquidityAndObligationCollateralOperationArgs, IDepositElendMarketOperation, InitObligationArgs } from '../../interfaces/operations';
export declare class DepositElendMarketOperation implements IDepositElendMarketOperation {
    private contract;
    private query;
    private networkConfig;
    private pythClient;
    private suiClient;
    constructor(networkConfig: NetworkConfig, suiClient: SuiClient);
    buildInitObligationTxn(args: InitObligationArgs): Promise<Transaction>;
    buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
    buildInitAndDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Promise<Transaction>;
    private handleDepositOperation;
}
