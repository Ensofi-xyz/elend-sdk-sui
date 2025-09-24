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
    this.packageId = config.version.package;
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
    const { version, reserve, priceInfoObject, clock } = args;

    tx.moveCall({
      target: `${this.packageId}::lending_market::refresh_reserve`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(reserve), tx.object(priceInfoObject), tx.object(clock)],
    });
  }

  refreshObligation(tx: Transaction, typeArgs: [string, string, string, string], args: RefreshObligation): void {
    const { version, obligation, reserveT1, reserveT2, reserveT3, clock } = args;

    tx.moveCall({
      target: `${this.packageId}::lending_market::refresh_obligation`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(obligation), tx.object(reserveT1), tx.object(reserveT2), tx.object(reserveT3), tx.object(clock)],
    });
  }

  depositReserveLiquidityAndMintCTokens(
    tx: Transaction,
    typeArgs: [string, string],
    args: DepositReserveLiquidityAndMintCTokensArgs
  ): TransactionResult {
    const { version, reserve, coin, priceInfoObject, clock } = args;

    const result = tx.moveCall({
      target: `${this.packageId}::lending_market::deposit_reserve_liquidity_and_mint_ctokens`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(reserve), tx.object(coin), tx.object(priceInfoObject), tx.object(clock)],
    });

    return result;
  }

  depositCTokensIntoObligation(tx: Transaction, typeArgs: [string, string], args: DepositCTokensIntoObligationArgs): void {
    const { obligationOwnerCap, version, reserve, obligation, cToken, clock } = args;

    tx.moveCall({
      target: `${this.packageId}::lending_market::deposit_ctokens_into_obligation`,
      typeArguments: typeArgs,
      arguments: [tx.object(obligationOwnerCap), tx.object(version), tx.object(reserve), tx.object(obligation), tx.object(cToken), tx.object(clock)],
    });
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
