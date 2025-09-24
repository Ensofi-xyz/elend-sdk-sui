import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { DepositReserveLiquidityAndObligationCollateralOperationArgs, IDepositElendMarketOperation } from '../../interfaces/operations';

export class DepositElendMarketOperation implements IDepositElendMarketOperation {
  buildDepositTxn(args: DepositReserveLiquidityAndObligationCollateralOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
