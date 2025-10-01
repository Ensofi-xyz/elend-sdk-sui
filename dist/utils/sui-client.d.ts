import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
export declare const getSuiClientInstance: (rpcUrl: string, wsRpcUrl: string, rpcApiKey?: string) => SuiClient;
export declare const getSignerByPrivateKey: (privateKey: string) => Ed25519Keypair;
