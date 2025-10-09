import { Transaction, TransactionObjectInput, TransactionResult } from '@mysten/sui/transactions';
export interface IElendMarketContract {
    initObligation(tx: Transaction, typeArgs: string, args: InitObligationArgs): any;
    refreshReserve(tx: Transaction, typeArgs: [string, string], args: RefreshReserveArgs): void;
    refreshObligation(tx: Transaction, typeArgs: [string, string, string, string], args: RefreshObligation): void;
    depositReserveLiquidityAndMintCTokens(tx: Transaction, typeArgs: [string, string], args: DepositReserveLiquidityAndMintCTokensArgs): TransactionResult;
    depositCTokensIntoObligation(tx: Transaction, typeArgs: [string, string], args: DepositCTokensIntoObligationArgs): void;
    withdrawCTokensAndRedeemLiquidity(tx: Transaction, typeArgs: [string, string], args: WithdrawCTokensAndRedeemLiquidityArgs): TransactionResult;
    borrowObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: BorrowObligationLiquidityArgs): TransactionResult;
    repayObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: RepayObligationLiquidityArgs): void;
    updateRewardConfig(tx: Transaction, typeArgs: [string, string], args: UpdateRewardConfigArgs): void;
    initUserReward(tx: Transaction, typeArgs: [string, string], args: InitUserRewardArgs): void;
    updateUserReward(tx: Transaction, typeArgs: [string, string], args: UpdateUserRewardArgs): void;
    claimReward(tx: Transaction, typeArgs: [string, string], args: ClaimRewardArgs): void;
}
export interface InitObligationArgs {
    version: TransactionObjectInput;
    market: TransactionObjectInput;
    owner: TransactionObjectInput;
    clock: TransactionObjectInput;
}
export interface RefreshReserveArgs {
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    priceInfoObject: TransactionObjectInput;
    clock: TransactionObjectInput;
}
export interface RefreshObligation {
    version: TransactionObjectInput;
    obligation: TransactionObjectInput | TransactionResult;
    reserveT1: TransactionObjectInput;
    reserveT2: TransactionObjectInput;
    reserveT3: TransactionObjectInput;
    clock: TransactionObjectInput;
}
export interface DepositReserveLiquidityAndMintCTokensArgs {
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    coin: TransactionObjectInput;
    priceInfoObject: TransactionObjectInput;
    clock: TransactionObjectInput;
}
export interface DepositCTokensIntoObligationArgs {
    obligationOwnerCap: TransactionObjectInput | TransactionResult;
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    obligation: TransactionObjectInput | TransactionResult;
    cToken: TransactionObjectInput;
    clock: TransactionObjectInput;
}
export interface WithdrawCTokensAndRedeemLiquidityArgs {
    obligationOwnerCap: TransactionObjectInput;
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    obligation: TransactionObjectInput;
    collateralAmount: bigint;
    clock: TransactionObjectInput;
}
export interface BorrowObligationLiquidityArgs {
    obligationOwnerCap: TransactionObjectInput;
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    obligation: TransactionObjectInput;
    liquidityAmount: bigint;
    clock: TransactionObjectInput;
}
export interface RepayObligationLiquidityArgs {
    obligationOwnerCap: TransactionObjectInput;
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    obligation: TransactionObjectInput;
    repayCoin: TransactionObjectInput;
    repayAmount: bigint;
    clock: TransactionObjectInput;
}
export interface UpdateRewardConfigArgs {
    version: TransactionObjectInput;
    reserve: TransactionObjectInput;
    option: number;
    clock: TransactionObjectInput;
}
export interface InitUserRewardArgs {
    version: TransactionObjectInput;
    obligation: TransactionObjectInput | TransactionResult;
    reserve: string;
    option: number;
    phase: number;
}
export interface UpdateUserRewardArgs {
    version: TransactionObjectInput;
    obligation: TransactionObjectInput | TransactionResult;
    reserve: TransactionObjectInput;
    option: number;
}
export interface ClaimRewardArgs {
    version: TransactionObjectInput;
    tokenRewardState: TransactionObjectInput;
    obligation: TransactionObjectInput;
    reserve: string;
    option: number;
}
