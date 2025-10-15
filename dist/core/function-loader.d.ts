import { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { NetworkConfig } from '../interfaces/config';
import { BorrowObligationLiquidityArgs, ClaimRewardArgs, DepositCTokensIntoObligationArgs, DepositReserveLiquidityAndMintCTokensArgs, IElendMarketContract, InitObligationArgs, InitUserRewardArgs, RefreshObligation, RefreshReserveArgs, RepayObligationLiquidityArgs, UpdateRewardConfigArgs, UpdateUserRewardArgs, WithdrawCTokensAndRedeemLiquidityArgs } from '../interfaces/functions';
export declare class ElendMarketContract implements IElendMarketContract {
    private networkConfig;
    private packageId;
    constructor(networkConfig: NetworkConfig);
    initObligation(tx: Transaction, typeArgs: string, args: InitObligationArgs): any;
    refreshReserve(tx: Transaction, typeArgs: [string, string], args: RefreshReserveArgs): void;
    refreshObligation(tx: Transaction, typeArgs: [string, string, string, string, string], args: RefreshObligation): void;
    depositReserveLiquidityAndMintCTokens(tx: Transaction, typeArgs: [string, string], args: DepositReserveLiquidityAndMintCTokensArgs): TransactionResult;
    depositCTokensIntoObligation(tx: Transaction, typeArgs: [string, string], args: DepositCTokensIntoObligationArgs): void;
    withdrawCTokensAndRedeemLiquidity(tx: Transaction, typeArgs: [string, string], args: WithdrawCTokensAndRedeemLiquidityArgs): TransactionResult;
    borrowObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: BorrowObligationLiquidityArgs): TransactionResult;
    repayObligationLiquidity(tx: Transaction, typeArgs: [string, string], args: RepayObligationLiquidityArgs): void;
    updateRewardConfig(tx: Transaction, typeArgs: [string, string], args: UpdateRewardConfigArgs): void;
    initUserReward(tx: Transaction, typeArgs: [string, string], args: InitUserRewardArgs): void;
    updateUserReward(tx: Transaction, typeArgs: [string, string], args: UpdateUserRewardArgs): void;
    claimReward(tx: Transaction, typeArgs: [string, string], args: ClaimRewardArgs): void;
    private isTransactionResult;
}
