import { Transaction, TransactionResult } from '@mysten/sui/transactions';

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
    this.packageId = config.upgradedPackage;
  }

  initObligation(tx: Transaction, typeArgs: string, args: InitObligationArgs): TransactionResult {
    const { version, market, owner, clock } = args;

    const result = tx.moveCall({
      target: `${this.packageId}::lending_market::init_obligation`,
      typeArguments: [typeArgs],
      arguments: [tx.object(version), tx.object(market), tx.pure.address(owner as string), tx.object(clock)],
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
    const { obligationOwnerCap, version, reserve, obligation, collateralAmount, clock } = args;

    const result = tx.moveCall({
      target: `${this.packageId}::lending_market::withdraw_ctoken_and_redeem_liquidity`,
      typeArguments: typeArgs,
      arguments: [
        tx.object(obligationOwnerCap),
        tx.object(version),
        tx.object(reserve),
        tx.object(obligation),
        tx.pure.u64(collateralAmount),
        tx.object(clock),
      ],
    });

    return result;
  }

  borrowObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: BorrowObligationLiquidityArgs): TransactionResult {
    const { obligationOwnerCap, version, reserve, obligation, liquidityAmount, clock } = args;

    const result = tx.moveCall({
      target: `${this.packageId}::lending_market::borrow_obligation_liquidity`,
      typeArguments: typeArgs,
      arguments: [
        tx.object(obligationOwnerCap),
        tx.object(version),
        tx.object(reserve),
        tx.object(obligation),
        tx.pure.u64(liquidityAmount),
        tx.object(clock),
      ],
    });

    return result;
  }

  repayObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: RepayObligationLiquidityArgs): void {
    const { obligationOwnerCap, version, reserve, obligation, repayCoin, repayAmount, clock } = args;

    tx.moveCall({
      target: `${this.packageId}::lending_market::repay_obligation_liquidity`,
      typeArguments: typeArgs,
      arguments: [
        tx.object(obligationOwnerCap),
        tx.object(version),
        tx.object(reserve),
        tx.object(obligation),
        tx.object(repayCoin),
        tx.pure.u64(repayAmount),
        tx.object(clock),
      ],
    });
  }

  updateRewardConfig(tx: Transaction, typeArgs: [string, string], args: UpdateRewardConfigArgs): void {
    const { version, reserve, option, clock } = args;
    tx.moveCall({
      target: `${this.packageId}::lending_market::update_reward_config`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(reserve), tx.pure.u8(option), tx.object(clock)],
    });
  }

  initUserReward(tx: Transaction, typeArgs: [string, string], args: InitUserRewardArgs): void {
    const { version, obligation, reserve, option, phase } = args;
    tx.moveCall({
      target: `${this.packageId}::lending_market::init_user_reward`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(obligation), tx.pure.address(reserve), tx.pure.u8(option), tx.pure.u16(phase)],
    });
  }

  updateUserReward(tx: Transaction, typeArgs: [string, string], args: UpdateUserRewardArgs): void {
    const { version, obligation, reserve, option } = args;
    tx.moveCall({
      target: `${this.packageId}::lending_market::update_user_reward`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(obligation), tx.object(reserve), tx.pure.u8(option)],
    });
  }

  claimReward(tx: Transaction, typeArgs: [string, string], args: ClaimRewardArgs): void {
    const { version, tokenRewardState, obligation, reserve, option } = args;
    tx.moveCall({
      target: `${this.packageId}::lending_market::claim_reward`,
      typeArguments: typeArgs,
      arguments: [tx.object(version), tx.object(tokenRewardState), tx.object(obligation), tx.pure.address(reserve), tx.pure.u8(option)],
    });
  }
}
