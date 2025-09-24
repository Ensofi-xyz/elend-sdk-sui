import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { ClaimRewardOperationArgs, IElendMarketRewardOperation } from '../../interfaces/operations';

export class ElendMarketRewardOperation implements IElendMarketRewardOperation {
  buildClaimRewardTxn(args: ClaimRewardOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
