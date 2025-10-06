"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketRewardCalculationOperation = void 0;
const decimal_js_1 = require("decimal.js");
const types_1 = require("../../types");
const utils_1 = require("../../utils");
const obligation_calculation_1 = require("./obligation-calculation");
const reserve_calculation_1 = require("./reserve-calculation");
class ElendMarketRewardCalculationOperation {
    constructor(queryOperation) {
        this.queryOperation = queryOperation;
    }
    async getTotalIncentiveRewardStatisticObligation(obligation, associateReserves, reserveMarketType, reserveTokenPrice, reserves) {
        const results = await Promise.all(Array.from(associateReserves.entries())
            .filter(([reserveAddress]) => {
            if (!reserves)
                return true;
            return reserves.some(r => r === reserveAddress);
        })
            .map(async ([reserveAddress, reserve]) => {
            const marketType = reserveMarketType.get(reserveAddress);
            if (!marketType) {
                throw new Error(`Market type not found for reserve address: ${reserveAddress}`);
            }
            // Deposit reward
            const incentiveRewardRes = [];
            const rewardConfigDeposits = await this.queryOperation.fetchRewardConfigs(reserveAddress, marketType, types_1.RewardOption.Deposit);
            for (const rewardConfigDeposit of rewardConfigDeposits) {
                const userRewardDeposit = await this.queryOperation.fetchUserReward(reserveAddress, rewardConfigDeposit.rewardTokenType, types_1.RewardOption.Deposit, obligation.id, obligation.owner);
                const pendingRewardDeposit = userRewardDeposit
                    ? this.estimatePendingReward(reserve, obligation, associateReserves, reserveTokenPrice, rewardConfigDeposit, userRewardDeposit)
                    : new decimal_js_1.Decimal(0);
                incentiveRewardRes.push({
                    reserve: reserve.id,
                    //TODO: update later
                    rewardTokenInfo: {
                        symbol: 'EUSD',
                        tokenType: rewardConfigDeposit.rewardTokenType,
                        decimals: 9,
                    },
                    option: types_1.RewardOption.Deposit,
                    earnedReward: userRewardDeposit ? userRewardDeposit.earnedAmount.toDecimalJs() : new decimal_js_1.Decimal(0),
                    pendingReward: pendingRewardDeposit,
                    claimedReward: userRewardDeposit ? userRewardDeposit.claimedAmount.toDecimalJs() : new decimal_js_1.Decimal(0),
                });
            }
            // Borrow reward
            const rewardConfigBorrows = await this.queryOperation.fetchRewardConfigs(reserveAddress, marketType, types_1.RewardOption.Borrow);
            for (const rewardConfigBorrow of rewardConfigBorrows) {
                const userRewardBorrow = await this.queryOperation.fetchUserReward(reserveAddress, rewardConfigBorrow.rewardTokenType, types_1.RewardOption.Deposit, obligation.id, obligation.owner);
                const pendingRewardBorrow = userRewardBorrow
                    ? this.estimatePendingReward(reserve, obligation, associateReserves, reserveTokenPrice, rewardConfigBorrow, userRewardBorrow)
                    : new decimal_js_1.Decimal(0);
                incentiveRewardRes.push({
                    reserve: reserve.id,
                    //TODO: update later
                    rewardTokenInfo: {
                        symbol: 'EUSD',
                        tokenType: rewardConfigBorrow.rewardTokenType,
                        decimals: 9,
                    },
                    option: types_1.RewardOption.Deposit,
                    earnedReward: userRewardBorrow ? userRewardBorrow.earnedAmount.toDecimalJs() : new decimal_js_1.Decimal(0),
                    pendingReward: pendingRewardBorrow,
                    claimedReward: userRewardBorrow ? userRewardBorrow.claimedAmount.toDecimalJs() : new decimal_js_1.Decimal(0),
                });
            }
            return incentiveRewardRes;
        }));
        return results.flat();
    }
    async calculateIncentiveRewardApyInterest(reserve, marketType, option) {
        const rewardConfigs = await this.queryOperation.fetchRewardConfigs(reserve.id, marketType, option);
        const result = new Map();
        const reserveCalculation = new reserve_calculation_1.ElendMarketReserveCalculationOperation(this.queryOperation);
        for (const rewardConfig of rewardConfigs) {
            const totalDuration = Number(rewardConfig.endAt - rewardConfig.startedAt);
            const currentTimestamp = new Date().getTime();
            const remainingTimestamp = Math.max(0, Number(rewardConfig.endAt) - currentTimestamp);
            if (remainingTimestamp <= 0 || BigInt(currentTimestamp) < rewardConfig.startedAt) {
                result.set(rewardConfig.rewardTokenType, new decimal_js_1.Decimal(0));
                continue;
            }
            let totalEffective = new decimal_js_1.Decimal(0);
            switch (rewardConfig.option) {
                case types_1.RewardOption.Deposit: // Supply - withdraw
                    totalEffective = reserveCalculation.getTotalSupply(reserve);
                    break;
                case types_1.RewardOption.Borrow: //Borrow - repay
                    totalEffective = reserveCalculation.getBorrowedAmount(reserve);
                    break;
            }
            if (totalEffective.eq(0)) {
                result.set(rewardConfig.rewardTokenType, new decimal_js_1.Decimal(0));
                continue;
            }
            const marketPrice = reserveCalculation.getReserveMarketPrice(reserve);
            const totalEffectiveValue = totalEffective.div(new decimal_js_1.Decimal(Math.pow(10, reserve.liquidity.mintDecimal))).mul(marketPrice);
            const remainingRewardFunds = new decimal_js_1.Decimal(rewardConfig.totalFunds).div(new decimal_js_1.Decimal(totalDuration)).mul(new decimal_js_1.Decimal(remainingTimestamp));
            const remainingRewardFundsValue = remainingRewardFunds.div(Math.pow(10, 9));
            result.set(rewardConfig.rewardTokenType, remainingRewardFundsValue.div(totalEffectiveValue).div(remainingTimestamp).mul(utils_1.MILLISECONDS_PER_YEAR));
        }
        return result;
    }
    async estimateIncentiveRewardNewApyInterest(reserve, marketType, option, amount, userAction) {
        const rewardConfigs = await this.queryOperation.fetchRewardConfigs(reserve.id, marketType, option);
        const result = new Map();
        const reserveCalculation = new reserve_calculation_1.ElendMarketReserveCalculationOperation(this.queryOperation);
        for (const rewardConfig of rewardConfigs) {
            const totalDuration = rewardConfig.endAt - rewardConfig.startedAt;
            const currentTimestamp = new Date().getTime();
            const remainingTimestamp = Math.max(0, Number(rewardConfig.endAt) - currentTimestamp);
            if (remainingTimestamp <= 0) {
                result.set(rewardConfig.rewardTokenType, new decimal_js_1.Decimal(0));
                continue;
            }
            let totalEffective = new decimal_js_1.Decimal(0);
            switch (userAction) {
                case types_1.UserActionType.Deposit:
                    totalEffective = reserveCalculation.getTotalSupply(reserve).add(new decimal_js_1.Decimal(amount));
                    break;
                case types_1.UserActionType.Borrow:
                    totalEffective = reserveCalculation.getBorrowedAmount(reserve).add(new decimal_js_1.Decimal(amount));
                    break;
                case types_1.UserActionType.Withdraw:
                    totalEffective = reserveCalculation.getTotalSupply(reserve).sub(new decimal_js_1.Decimal(amount));
                    break;
                case types_1.UserActionType.Repay:
                    totalEffective = reserveCalculation.getBorrowedAmount(reserve).sub(new decimal_js_1.Decimal(amount));
                    break;
            }
            if (totalEffective.eq(0)) {
                result.set(rewardConfig.rewardTokenType, new decimal_js_1.Decimal(0));
                continue;
            }
            const marketPrice = reserveCalculation.getReserveMarketPrice(reserve);
            const totalEffectiveValue = totalEffective.div(new decimal_js_1.Decimal(Math.pow(10, reserve.liquidity.mintDecimal))).mul(marketPrice);
            const remainingRewardFunds = new decimal_js_1.Decimal(rewardConfig.totalFunds.toString())
                .div(new decimal_js_1.Decimal(totalDuration.toString()))
                .mul(new decimal_js_1.Decimal(remainingTimestamp.toString()));
            const remainingRewardFundsValue = remainingRewardFunds.div(Math.pow(10, 9));
            result.set(rewardConfig.rewardTokenType, remainingRewardFundsValue.div(totalEffectiveValue).div(remainingTimestamp).mul(utils_1.MILLISECONDS_PER_YEAR));
        }
        return result;
    }
    estimatePendingReward(reserve, obligation, associateReserves, reserveTokenPrice, rewardConfig, userReward) {
        let totalEffective = new decimal_js_1.Decimal(0);
        let userEffective = new decimal_js_1.Decimal(0);
        const currentTimestamp = new Date().getTime();
        const elapsedTime = Math.max(0, Math.min(currentTimestamp, Number(rewardConfig.endAt)) - Number(rewardConfig.lastUpdatedAt));
        const reserveCalculation = new reserve_calculation_1.ElendMarketReserveCalculationOperation(this.queryOperation);
        const obligationCalculation = new obligation_calculation_1.ElendMarketObligationCalculationOperation(this.queryOperation);
        switch (rewardConfig.option) {
            case types_1.RewardOption.Deposit: //supply
                totalEffective = reserveCalculation.getTotalSupply(reserve);
                userEffective =
                    obligationCalculation.getDetailSuppliedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, [reserve])[0]?.suppliedAmount ||
                        new decimal_js_1.Decimal(0);
                break;
            case types_1.RewardOption.Borrow: //borrow
                totalEffective = reserveCalculation.getBorrowedAmount(reserve);
                userEffective =
                    obligationCalculation.getDetailBorrowedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, [reserve])[0]?.borrowedAmount ||
                        new decimal_js_1.Decimal(0);
                break;
        }
        const rewardDistributeRate = new decimal_js_1.Decimal(BigInt(rewardConfig.totalFunds) / (BigInt(rewardConfig.endAt) - BigInt(rewardConfig.startedAt)));
        const globalRewardIndex = rewardDistributeRate.mul(new decimal_js_1.Decimal(elapsedTime)).div(totalEffective);
        const newGlobalRewardIndex = globalRewardIndex.add(rewardConfig.lastGlobalRewardIndex.toDecimalJs());
        const earnedAmount = newGlobalRewardIndex.sub(userReward.userRewardIndex.toDecimalJs()).mul(userEffective);
        return userReward.earnedAmount.toDecimalJs().add(earnedAmount).sub(userReward.claimedAmount.toDecimalJs());
    }
}
exports.ElendMarketRewardCalculationOperation = ElendMarketRewardCalculationOperation;
//# sourceMappingURL=reward-calculation.js.map