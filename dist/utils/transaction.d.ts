import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
export declare const waitSignAndExecuteTransactionIX: (suiClient: SuiClient, tx: Transaction, signer: Ed25519Keypair) => Promise<SuiTransactionBlockResponse>;
