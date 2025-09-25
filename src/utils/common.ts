import { isNil } from 'lodash';

import { SuiClient, SuiHTTPTransport } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export const getSuiClientInstance = (rpcUrl: string, wsRpcUrl: string, rpcApiKey?: string) => {
  if (!isNil(rpcApiKey)) {
    return new SuiClient({
      transport: new SuiHTTPTransport({
        url: rpcUrl,
        WebSocketConstructor: WebSocket as never,
        websocket: {
          url: `${wsRpcUrl}/${rpcApiKey}`,
        },
        rpc: {
          headers: {
            'Content-Type': 'application/json',
            'x-allthatnode-api-key': rpcApiKey,
          },
        },
      }),
    });
  } else {
    return new SuiClient({
      transport: new SuiHTTPTransport({
        url: rpcUrl,
        WebSocketConstructor: WebSocket as never,
        websocket: {
          url: wsRpcUrl,
        },
      }),
    });
  }
};

export const getSignerByPrivateKey = (privateKey: string) => {
  const { schema, secretKey } = decodeSuiPrivateKey(privateKey);
  return Ed25519Keypair.fromSecretKey(secretKey, {
    skipValidation: true,
  });
};

export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export async function retry<T>(fn: () => Promise<T>, delay: number, maxRetries: number): Promise<T> {
  return await recall(fn, delay, 0, maxRetries);
}

async function recall<T>(fn: () => T, delay: number, retries: number, maxRetries: number): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > maxRetries) {
      throw err;
    }
    await wait(delay);
  }

  return await recall(fn, delay, retries + 1, maxRetries);
}
