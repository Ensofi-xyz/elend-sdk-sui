import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { IRepayElendMarketOperation, RepayObligationLiquidityOperationArgs } from '../../interfaces/operations';

export class RepayElendMarketOperation implements IRepayElendMarketOperation {
  buildRepayTxn(args: RepayObligationLiquidityOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
