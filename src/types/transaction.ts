import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

export const waitSignAndExecuteTransaction = async (suiClient: SuiClient, tx: Transaction, signer: Ed25519Keypair) => {
  const res = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer,
  });
  const confirmedRes = await suiClient.waitForTransaction({
    digest: res.digest,
  });
  return confirmedRes;
};
