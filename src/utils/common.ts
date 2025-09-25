import { ElendMarketConfig } from '../interfaces/config';

export const getTokenTypeForReserve = (reserveId: string, packageConfig: ElendMarketConfig): string | null => {
  const reserves = packageConfig.reserves;
  for (const [tokenType, reserveInfo] of Object.entries(reserves)) {
    if ((reserveInfo as any).id === reserveId) {
      return tokenType;
    }
  }
  return null;
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
