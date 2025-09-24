import { Transaction } from '@mysten/sui/dist/cjs/transactions';

import { IWithdrawElendMarketOperation, WithdrawCTokensAndRedeemLiquidityOperationArgs } from '../../interfaces/operations';

export class WithdrawElendMarketOperation implements IWithdrawElendMarketOperation {
  buildWithdrawTxn(args: WithdrawCTokensAndRedeemLiquidityOperationArgs): Transaction {
    throw new Error('Method not implemented.');
  }
}
