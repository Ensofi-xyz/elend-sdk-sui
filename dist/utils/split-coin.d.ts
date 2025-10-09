import { CoinStruct, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
export declare const mergeAllCoin: (coins: CoinStruct[], tx: Transaction) => Promise<string>;
export declare const getCoinToSplit: (suiClient: SuiClient, tx: Transaction, walletAddress: string, amount: number, coinType: string) => Promise<string>;
export declare const splitCoin: (suiClient: SuiClient, tx: Transaction, walletAddress: string, coinType: string, amounts: number[]) => Promise<any>;
