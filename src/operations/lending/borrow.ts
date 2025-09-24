import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { BorrowObligationLiquidityOperationArgs, IBorrowElendMarketOperation } from '../../interfaces/operations';

export class BorrowElendMarketOperation implements IBorrowElendMarketOperation {
  buildBorrowTxn(args: BorrowObligationLiquidityOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
