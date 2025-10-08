import { Transaction } from '@mysten/sui/transactions';
import { SuiPythClient } from '@pythnetwork/pyth-sui-js';
import { ObjectId } from '@pythnetwork/pyth-sui-js/lib/client';
import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketContract } from '../../interfaces/functions';
import { Obligation } from '../../types/object';
export declare const refreshReserves: (tx: Transaction, args: {
    obligationData: Obligation | null;
    reserve: string;
    pythClient: SuiPythClient;
    networkConfig: NetworkConfig;
    contract: IElendMarketContract;
}) => Promise<ObjectId>;
