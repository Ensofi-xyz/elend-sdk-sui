import { Transaction, TransactionArgument, TransactionObjectInput, TransactionResult } from '@mysten/sui/transactions';

export interface IElendMarketContract {
  initObligation(tx: Transaction, typeArgs: string, args: InitObligationArgs): TransactionResult;
  refreshReserve(tx: Transaction, typeArgs: [string, string], args: RefreshReserveArgs): void;
  refreshObligation(tx: Transaction, typeArgs: [string, string, string, string], args: RefreshObligation): void;
  depositReserveLiquidityAndMintCTokens(
    tx: Transaction,
    typeArgs: [string, string],
    args: DepositReserveLiquidityAndMintCTokensArgs
  ): TransactionResult;
  depositCTokensIntoObligation(tx: Transaction, typeArgs: [string, string], args: DepositCTokensIntoObligationArgs): void;
  withdrawCTokensAndRedeemLiquidity(tx: Transaction, typeArgs: [string, string], args: WithdrawCTokensAndRedeemLiquidityArgs): TransactionResult;
  borrowObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: BorrowObligationLiquidityArgs): TransactionResult;
  repayObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: RepayObligationLiquidityArgs): void;
  lockToLiquidate(tx: Transaction, typeArgs: string, args: LockToLiquidateArgs): void;
  calculateLiquidate(tx: Transaction, typeArgs: [string, string], args: CalculateLiquidateArgs): TransactionResult;
  repayLiquidateReserve(tx: Transaction, typeArgs: [string, string], args: RepayLiquidateReserveArgs): void;
  updateRewardConfig(tx: Transaction, typeArgs: [string, string], args: UpdateRewardConfigArgs): void;
  initUserReward(tx: Transaction, typeArgs: [string, string], args: InitUserRewardArgs): void;
  updateUserReward(tx: Transaction, typeArgs: [string, string], args: UpdateUserRewardArgs): void;
  claimReward(tx: Transaction, typeArgs: [string, string], args: ClaimRewardArgs): void;
}

interface InitObligationArgs {
  version: TransactionObjectInput;
  owner: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface RefreshReserveArgs {
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  priceInfoObject: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface RefreshObligation {
  version: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserveT1: TransactionObjectInput;
  reserveT2: TransactionObjectInput;
  reserveT3: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface DepositReserveLiquidityAndMintCTokensArgs {
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  coin: TransactionObjectInput;
  priceInfoObject: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface DepositCTokensIntoObligationArgs {
  obligationOwnerCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  cToken: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface WithdrawCTokensAndRedeemLiquidityArgs {
  obligationOwnerCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  collateralAmount: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

interface BorrowObligationLiquidityArgs {
  obligationOwnerCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  liquidityAmount: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

interface RepayObligationLiquidityArgs {
  obligationOwnerCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  repayCoin: TransactionObjectInput;
  repayAmount: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

interface LockToLiquidateArgs {
  operatorCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface CalculateLiquidateArgs {
  operatorCap: TransactionObjectInput;
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
}

interface RepayLiquidateReserveArgs {
  operatorCap: TransactionObjectInput;
  version: TransactionObjectInput;
  repayReserve: TransactionObjectInput;
  obligation: TransactionObjectInput;
  repayCoin: TransactionObjectInput;
  clock: TransactionObjectInput;
}

interface UpdateRewardConfigArgs {
  version: TransactionObjectInput;
  reserve: TransactionObjectInput;
  option: number | TransactionArgument;
  clock: TransactionObjectInput;
}

interface InitUserRewardArgs {
  version: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  option: number | TransactionArgument;
}

interface UpdateUserRewardArgs {
  version: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  option: number | TransactionArgument;
}

interface ClaimRewardArgs {
  version: TransactionObjectInput;
  tokenRewardState: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  option: number | TransactionArgument;
}
