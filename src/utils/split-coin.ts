import { isNil } from 'lodash';

import { CoinStruct, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { wait } from './common';

export const mergeAllCoin = async (coins: CoinStruct[], tx: Transaction) => {
  if (coins.length == 0) {
    console.log('No coins to merge');
    throw new Error('No coins to merge');
  } else if (coins.length == 1) {
    console.log('Only one coin to merge');
    return coins[0].coinObjectId;
  }
  const coinsFiltered = coins.map(coin => coin.coinObjectId);
  const [destinationCoin, ...restCoin] = coinsFiltered;
  tx.mergeCoins(destinationCoin, restCoin);
  return destinationCoin;
};

export const getCoinToSplit = async (
  suiClient: SuiClient,
  tx: Transaction,
  walletAddress: string,
  amount: number,
  coinType: string
): Promise<string> => {
  const coins = [];
  let cursor = null;
  while (true) {
    const paginatedCoins = await suiClient.getAllCoins({
      owner: walletAddress,
      cursor,
    });
    cursor = !isNil(paginatedCoins.nextCursor) ? paginatedCoins.nextCursor : null;

    for (const coin of paginatedCoins.data) {
      if (coin.coinType === coinType && Number(coin.balance) > amount) {
        return coin.coinObjectId;
      } else if (coin.coinType === coinType) {
        coins.push(coin);
      }
    }
    if (!paginatedCoins.hasNextPage) break;
    await wait(100);
  }
  return await mergeAllCoin(coins, tx);
};

export const splitCoin = async (suiClient: SuiClient, tx: Transaction, walletAddress: string, coinType: string, amounts: number[]): Promise<any> => {
  const balance = await suiClient.getBalance({
    owner: walletAddress,
    coinType,
  });
  const totalAmount = amounts.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  if (BigInt(balance.totalBalance) < totalAmount) {
    throw new Error(`Not enough balance coin type ${coinType} to split from ${walletAddress}`);
  }
  const coinToSplit = await getCoinToSplit(suiClient, tx, walletAddress, totalAmount, coinType);
  const serializedAmounts = amounts.map(amount => tx.pure.u64(amount));
  const coinsSplitted = tx.splitCoins(coinToSplit, serializedAmounts);
  return coinsSplitted;
};
