import { Decimal as DecimalJs } from 'decimal.js';

import { ElendMarketConfig } from '../interfaces/config';

export const SLOTS_PER_SECOND = 2;
export const SLOTS_PER_MINUTE = SLOTS_PER_SECOND * 60;
export const SLOTS_PER_HOUR = SLOTS_PER_MINUTE * 60;
export const SLOTS_PER_DAY = SLOTS_PER_HOUR * 24;
export const SLOTS_PER_YEAR = SLOTS_PER_DAY * 365;

export const getTokenTypeForReserve = (reserveId: string, packageConfig: ElendMarketConfig): string | null => {
  const reserves = packageConfig.reserves;
  for (const [tokenType, reserveInfo] of Object.entries(reserves)) {
    if ((reserveInfo as any).id === reserveId) {
      return tokenType;
    }
  }
  return null;
};

export const i64ToBigInt = (magnitude: bigint, negative: boolean): bigint => {
  return negative ? -magnitude : magnitude;
};

export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export function calculateAPYFromAPR(apr: number) {
  const apy = new DecimalJs(1).plus(new DecimalJs(apr).dividedBy(SLOTS_PER_YEAR)).toNumber() ** SLOTS_PER_YEAR - 1;
  return apy;
}

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
