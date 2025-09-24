import { Transaction, TransactionArgument, TransactionObjectInput, TransactionResult } from '@mysten/sui/transactions';

import { NetworkConfig } from '../interfaces/config';
import {
  BorrowObligationLiquidityArgs,
  ClaimRewardArgs,
  DepositCTokensIntoObligationArgs,
  DepositReserveLiquidityAndMintCTokensArgs,
  IElendMarketContract,
  InitObligationArgs,
  InitUserRewardArgs,
  RefreshObligation,
  RefreshReserveArgs,
  RepayObligationLiquidityArgs,
  UpdateRewardConfigArgs,
  UpdateUserRewardArgs,
  WithdrawCTokensAndRedeemLiquidityArgs,
} from '../interfaces/functions';

export class ElendMarketContract implements IElendMarketContract {
  private packageId: string;

  constructor(private networkConfig: NetworkConfig) {
    const config = this.networkConfig.packages[this.networkConfig.latestVersion];
    this.packageId = config.version.package; // Assuming package ID is stored here
  }

  initObligation(tx: Transaction, typeArgs: string, args: InitObligationArgs): TransactionResult {
    const { version, owner, clock } = args;

    const result = tx.moveCall({
      target: `${this.packageId}::lending_market::init_obligation`,
      typeArguments: [typeArgs],
      arguments: [tx.object(version), tx.pure.address(owner as string), tx.object(clock)],
    });

    return result;
  }

  refreshReserve(tx: Transaction, typeArgs: [string, string], args: RefreshReserveArgs): void {
    throw new Error('refreshReserve: Implementation pending - TODO');
  }

  refreshObligation(tx: Transaction, typeArgs: [string, string, string, string], args: RefreshObligation): void {
    throw new Error('refreshObligation: Implementation pending - TODO');
  }

  depositReserveLiquidityAndMintCTokens(
    tx: Transaction,
    typeArgs: [string, string],
    args: DepositReserveLiquidityAndMintCTokensArgs
  ): TransactionResult {
    throw new Error('depositReserveLiquidityAndMintCTokens: Implementation pending - TODO');
  }

  depositCTokensIntoObligation(tx: Transaction, typeArgs: [string, string], args: DepositCTokensIntoObligationArgs): void {
    throw new Error('depositCTokensIntoObligation: Implementation pending - TODO');
  }

  withdrawCTokensAndRedeemLiquidity(tx: Transaction, typeArgs: [string, string], args: WithdrawCTokensAndRedeemLiquidityArgs): TransactionResult {
    throw new Error('withdrawCTokensAndRedeemLiquidity: Implementation pending - TODO');
  }

  borrowObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: BorrowObligationLiquidityArgs): TransactionResult {
    throw new Error('borrowObligationLiquidity: Implementation pending - TODO');
  }

  repayObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: RepayObligationLiquidityArgs): void {
    throw new Error('repayObligationLiquidity: Implementation pending - TODO');
  }

  updateRewardConfig(tx: Transaction, typeArgs: [string, string], args: UpdateRewardConfigArgs): void {
    throw new Error('updateRewardConfig: Implementation pending - TODO');
  }

  initUserReward(tx: Transaction, typeArgs: [string, string], args: InitUserRewardArgs): void {
    throw new Error('initUserReward: Implementation pending - TODO');
  }

  updateUserReward(tx: Transaction, typeArgs: [string, string], args: UpdateUserRewardArgs): void {
    throw new Error('updateUserReward: Implementation pending - TODO');
  }

  claimReward(tx: Transaction, typeArgs: [string, string], args: ClaimRewardArgs): void {
    throw new Error('claimReward: Implementation pending - TODO');
  }
}
