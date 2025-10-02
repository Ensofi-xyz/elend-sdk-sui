"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketContract = void 0;
class ElendMarketContract {
    constructor(networkConfig) {
        this.networkConfig = networkConfig;
        const config = this.networkConfig.packages[this.networkConfig.latestVersion];
        this.packageId = config.upgradedPackage;
    }
    initObligation(tx, typeArgs, args) {
        const { version, market, owner, clock } = args;
        const result = tx.moveCall({
            target: `${this.packageId}::lending_market::init_obligation`,
            typeArguments: [typeArgs],
            arguments: [tx.object(version), tx.object(market), tx.pure.address(owner), tx.object(clock)],
        });
        return result;
    }
    refreshReserve(tx, typeArgs, args) {
        const { version, reserve, priceInfoObject, clock } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::refresh_reserve`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(reserve), tx.object(priceInfoObject), tx.object(clock)],
        });
    }
    refreshObligation(tx, typeArgs, args) {
        const { version, obligation, reserveT1, reserveT2, reserveT3, clock } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::refresh_obligation`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(obligation), tx.object(reserveT1), tx.object(reserveT2), tx.object(reserveT3), tx.object(clock)],
        });
    }
    depositReserveLiquidityAndMintCTokens(tx, typeArgs, args) {
        const { version, reserve, coin, priceInfoObject, clock } = args;
        const result = tx.moveCall({
            target: `${this.packageId}::lending_market::deposit_reserve_liquidity_and_mint_ctokens`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(reserve), tx.object(coin), tx.object(priceInfoObject), tx.object(clock)],
        });
        return result;
    }
    depositCTokensIntoObligation(tx, typeArgs, args) {
        const { obligationOwnerCap, version, reserve, obligation, cToken, clock } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::deposit_ctokens_into_obligation`,
            typeArguments: typeArgs,
            arguments: [tx.object(obligationOwnerCap), tx.object(version), tx.object(reserve), tx.object(obligation), tx.object(cToken), tx.object(clock)],
        });
    }
    withdrawCTokensAndRedeemLiquidity(tx, typeArgs, args) {
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
    borrowObligationLiquidity(tx, typeArgs, args) {
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
    repayObligationLiquidity(tx, typeArgs, args) {
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
    updateRewardConfig(tx, typeArgs, args) {
        const { version, reserve, option, clock } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::update_reward_config`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(reserve), tx.pure.u8(option), tx.object(clock)],
        });
    }
    initUserReward(tx, typeArgs, args) {
        const { version, obligation, reserve, option } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::init_user_reward`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(obligation), tx.pure.address(reserve), tx.pure.u8(option)],
        });
    }
    updateUserReward(tx, typeArgs, args) {
        const { version, obligation, reserve, option } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::update_user_reward`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(obligation), tx.object(reserve), tx.pure.u8(option)],
        });
    }
    claimReward(tx, typeArgs, args) {
        const { version, tokenRewardState, obligation, reserve, option } = args;
        tx.moveCall({
            target: `${this.packageId}::lending_market::claim_reward`,
            typeArguments: typeArgs,
            arguments: [tx.object(version), tx.object(tokenRewardState), tx.object(obligation), tx.pure.address(reserve), tx.pure.u8(option)],
        });
    }
}
exports.ElendMarketContract = ElendMarketContract;
//# sourceMappingURL=function-loader.js.map