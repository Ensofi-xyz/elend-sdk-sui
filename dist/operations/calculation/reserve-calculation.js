"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketReserveCalculationOperation = void 0;
const decimal_js_1 = require("decimal.js");
const lodash_1 = require("lodash");
const common_1 = require("../../types/common");
const utils_1 = require("../../utils");
const reward_calculation_1 = require("./reward-calculation");
const lst_1 = require("../../utils/lst");
class ElendMarketReserveCalculationOperation {
    constructor(queryOperation) {
        this.queryOperation = queryOperation;
    }
    getTotalSuppliedUSDValueOnMarket(reserves) {
        return reserves.reduce((acc, reserve) => {
            const totalSupplyUSDValue = this.getTotalSupply(reserve)
                .div(Math.pow(10, this.getMintDecimals(reserve)))
                .mul(this.getReserveMarketPrice(reserve));
            return acc.add(totalSupplyUSDValue);
        }, new decimal_js_1.Decimal(0));
    }
    getTotalBorrowedUSDValueOnMarket(reserves) {
        return reserves.reduce((acc, reserve) => {
            const totalBorrowUSDValue = this.getBorrowedAmount(reserve)
                .div(Math.pow(10, this.getMintDecimals(reserve)))
                .mul(this.getReserveMarketPrice(reserve));
            return acc.add(totalBorrowUSDValue);
        }, new decimal_js_1.Decimal(0));
    }
    getDetailSuppliedOnMarket(reserves) {
        return reserves.map(reserve => {
            const totalSupply = this.getTotalSupply(reserve).div(Math.pow(10, this.getMintDecimals(reserve)));
            const totalSupplyUSDValue = totalSupply.mul(this.getReserveMarketPrice(reserve));
            return {
                reserve: reserve.id,
                tokenLiquidity: {
                    symbol: reserve.config.tokenInfo.symbol,
                    tokenType: reserve.liquidity.mintTokenType,
                    decimals: reserve.liquidity.mintDecimal,
                },
                suppliedAmount: totalSupply,
                suppliedValue: totalSupplyUSDValue,
            };
        });
    }
    getDetailBorrowedOnMarket(reserves) {
        return Array.from(reserves.entries()).map(([reserveAddresses, reserve]) => {
            const totalBorrow = this.getBorrowedAmount(reserve).div(Math.pow(10, this.getMintDecimals(reserve)));
            const totalBorrowUSDValue = totalBorrow.mul(this.getReserveMarketPrice(reserve));
            return {
                reserve: reserve.id,
                tokenLiquidity: {
                    symbol: reserve.config.tokenInfo.symbol,
                    tokenType: reserve.liquidity.mintTokenType,
                    decimals: reserve.liquidity.mintDecimal,
                },
                borrowedAmount: totalBorrow,
                borrowedValue: totalBorrowUSDValue,
            };
        });
    }
    async getDetailSupplyApy(reserve, marketType, currentTimestampMs) {
        const supplyApy = (0, utils_1.calculateAPYFromAPR)(this.calculateSupplyAPR(reserve, currentTimestampMs));
        const rewardCalculation = new reward_calculation_1.ElendMarketRewardCalculationOperation(this.queryOperation);
        const rewardIncentiveApys = await rewardCalculation.calculateIncentiveRewardApyInterest(reserve, marketType, common_1.RewardOption.Deposit);
        const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new decimal_js_1.Decimal(0));
        let lstInterest = new decimal_js_1.Decimal(0);
        if (reserve.config.tokenInfo.symbol === lst_1.LSTAsset.HASUI) {
            lstInterest = await (0, lst_1.getHaSuiLstInterest)();
        }
        ;
        return {
            totalApy: new decimal_js_1.Decimal(supplyApy).add(totalIncentiveApy).add(lstInterest),
            breakdownApy: {
                supplyApy: new decimal_js_1.Decimal(supplyApy),
                rewardIncentiveApy: rewardIncentiveApys,
                lstInterest: lstInterest.toNumber(),
            },
        };
    }
    async getDetailBorrowApy(reserve, marketType, currentTimestampMs) {
        const borrowApy = (0, utils_1.calculateAPYFromAPR)(this.calculateBorrowAPR(reserve, currentTimestampMs));
        const rewardCalculation = new reward_calculation_1.ElendMarketRewardCalculationOperation(this.queryOperation);
        const rewardIncentiveApys = await rewardCalculation.calculateIncentiveRewardApyInterest(reserve, marketType, common_1.RewardOption.Borrow);
        const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new decimal_js_1.Decimal(0));
        return {
            totalApy: new decimal_js_1.Decimal(borrowApy).sub(totalIncentiveApy),
            breakdownApy: {
                borrowApy: new decimal_js_1.Decimal(borrowApy),
                rewardIncentiveApy: rewardIncentiveApys,
            },
        };
    }
    async totalSupplyAPYWithNewAvailableSupplyAmount(reserve, marketType, newAvailableAmount, currentTimestampMs, userAction) {
        const reserveData = (0, lodash_1.cloneDeep)(reserve);
        const actionAmount = userAction == common_1.UserActionType.Deposit
            ? new decimal_js_1.Decimal(newAvailableAmount.toString()).sub(new decimal_js_1.Decimal(reserveData.liquidity.availableAmount.toString())).toNumber()
            : new decimal_js_1.Decimal(reserveData.liquidity.availableAmount.toString()).sub(new decimal_js_1.Decimal(newAvailableAmount.toString())).toNumber();
        reserveData.liquidity.availableAmount = newAvailableAmount;
        const supplyApy = (0, utils_1.calculateAPYFromAPR)(this.calculateSupplyAPR(reserveData, currentTimestampMs));
        const rewardCalculation = new reward_calculation_1.ElendMarketRewardCalculationOperation(this.queryOperation);
        const rewardIncentiveApys = await rewardCalculation.estimateIncentiveRewardNewApyInterest(reserve, marketType, common_1.RewardOption.Deposit, actionAmount, userAction);
        const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new decimal_js_1.Decimal(0));
        let lstInterest = new decimal_js_1.Decimal(0);
        if (reserve.config.tokenInfo.symbol === lst_1.LSTAsset.HASUI) {
            lstInterest = await (0, lst_1.getHaSuiLstInterest)();
        }
        ;
        return new decimal_js_1.Decimal(supplyApy).add(totalIncentiveApy).add(lstInterest);
    }
    async totalBorrowAPYWithNewBorrowedAmount(reserve, marketType, newAvailableLiquidity, newBorrowedAmount, currentTimestampMs, userAction) {
        const reserveClone = (0, lodash_1.cloneDeep)(reserve);
        const actionAmount = userAction == common_1.UserActionType.Borrow
            ? newBorrowedAmount.toDecimalJs().sub(reserveClone.liquidity.borrowedAmount.toDecimalJs()).toNumber()
            : reserveClone.liquidity.borrowedAmount.toDecimalJs().sub(newBorrowedAmount.toDecimalJs()).toNumber();
        reserveClone.liquidity.availableAmount = newAvailableLiquidity;
        reserveClone.liquidity.borrowedAmount = newBorrowedAmount;
        const borrowApy = (0, utils_1.calculateAPYFromAPR)(this.calculateBorrowAPR(reserveClone, currentTimestampMs));
        const rewardCalculation = new reward_calculation_1.ElendMarketRewardCalculationOperation(this.queryOperation);
        const rewardIncentiveApys = await rewardCalculation.estimateIncentiveRewardNewApyInterest(reserve, marketType, common_1.RewardOption.Borrow, actionAmount, userAction);
        const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new decimal_js_1.Decimal(0));
        return new decimal_js_1.Decimal(borrowApy).sub(totalIncentiveApy);
    }
    getTotalSupply(reserve) {
        return this.getLiquidityAvailableAmount(reserve).add(this.getBorrowedAmount(reserve)).sub(this.getAccumulatedProtocolFees(reserve));
    }
    getBorrowedAmount(reserve) {
        return reserve.liquidity.borrowedAmount.toDecimalJs();
    }
    getTotalMintCollateral(reserve) {
        return new decimal_js_1.Decimal(reserve.collateral.mintTotalAmount);
    }
    getLiquidityAvailableAmount(reserve) {
        return new decimal_js_1.Decimal(reserve.liquidity.availableAmount.toString());
    }
    getCumulativeBorrowRate(reserve) {
        return reserve.liquidity.cumulativeBorrowRate.toDecimalJs();
    }
    getAccumulatedProtocolFees(reserve) {
        return reserve.liquidity.accumulatedProtocolFees.toDecimalJs();
    }
    getReserveMarketPrice(reserve) {
        return reserve.liquidity.marketPrice.toDecimalJs();
    }
    getMintDecimals(reserve) {
        return reserve.liquidity.mintDecimal;
    }
    calculateUtilizationRatio(reserve, slot) {
        if (!slot) {
            const totalBorrows = this.getBorrowedAmount(reserve);
            const totalSupply = this.getTotalSupply(reserve);
            if (totalSupply.eq(0)) {
                return 0;
            }
            return totalBorrows.dividedBy(totalSupply).toNumber();
        }
        else {
            const { totalBorrow: estimatedTotalBorrowed, totalSupply: estimatedTotalSupply } = this.getEstimatedDebtAndSupply(reserve, slot);
            if (estimatedTotalSupply.eq(0)) {
                return 0;
            }
            return estimatedTotalBorrowed.dividedBy(estimatedTotalSupply).toNumber();
        }
    }
    calculateSupplyAPR(reserve, timestampMs) {
        const currentUtilization = this.calculateUtilizationRatio(reserve);
        const borrowRate = this.calculateBorrowRate(reserve, timestampMs);
        const protocolTakeRatePct = 1 - reserve.config.reserveFactorRateBps / 10000;
        return currentUtilization * borrowRate * protocolTakeRatePct;
    }
    calculateBorrowAPR(reserve, timestampMs) {
        return this.calculateBorrowRate(reserve, timestampMs);
    }
    calculateBorrowRate(reserve, timestampMs) {
        const estimatedCurrentUtilization = this.calculateUtilizationRatio(reserve, timestampMs);
        return this.getBorrowRate(reserve, estimatedCurrentUtilization);
    }
    getEstimatedDebtAndSupply(reserve, timestampMs) {
        try {
            const timestampElapsed = Math.max(timestampMs - new decimal_js_1.Decimal(reserve.lastUpdate.timestampMs.toString()).toNumber(), 0);
            let totalBorrow;
            let totalSupply;
            if (timestampElapsed === 0) {
                totalBorrow = this.getBorrowedAmount(reserve);
                totalSupply = this.getTotalSupply(reserve);
            }
            else {
                const { newDebt, newAccProtocolFees } = this.compoundInterest(reserve, timestampElapsed);
                const newTotalSupply = this.getLiquidityAvailableAmount(reserve).add(newDebt).sub(newAccProtocolFees);
                totalBorrow = newDebt;
                totalSupply = newTotalSupply;
            }
            return { totalBorrow, totalSupply };
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
    getBorrowRate(reserve, utilizationRate) {
        const baseBorrowRate = reserve.config.baseFixedInterestRateBps / 10000;
        const utilizationOptimal = reserve.config.utilizationOptimalBps / 10000;
        const maxUtilization = reserve.config.utilizationLimitBlockBorrowingAboveBps / 10000;
        const borrowRateAtOptimalUtilization = reserve.config.borrowRateAtOptimalBps / 10000;
        const maxBorrowRate = reserve.config.maxInterestRateBps / 10000;
        const multiplier = (borrowRateAtOptimalUtilization - baseBorrowRate) / utilizationOptimal;
        if (utilizationRate === utilizationOptimal) {
            return borrowRateAtOptimalUtilization;
        }
        else if (utilizationRate < utilizationOptimal) {
            return baseBorrowRate + multiplier * utilizationRate;
        }
        else {
            const jumpRateMultiplier = (maxBorrowRate - borrowRateAtOptimalUtilization) / (maxUtilization - utilizationOptimal);
            return borrowRateAtOptimalUtilization + jumpRateMultiplier * (utilizationRate - utilizationOptimal);
        }
    }
    getEstimatedBorrowedAmount(reserve, timestampMs) {
        return this.getBorrowedAmount(reserve).mul(this.getEstimatedCumulativeBorrowRate(reserve, timestampMs));
    }
    getEstimatedCumulativeBorrowRate(reserve, timestampMs) {
        const currentBorrowRate = new decimal_js_1.Decimal(this.calculateBorrowAPR(reserve, timestampMs));
        const elapsedTimestamp = Math.max(timestampMs - Number(reserve.lastUpdate.timestampMs), 0);
        const compoundInterest = this.approximateCompoundedInterest(currentBorrowRate, elapsedTimestamp);
        const previousCumulativeBorrowRate = this.getCumulativeBorrowRate(reserve);
        return previousCumulativeBorrowRate.mul(compoundInterest);
    }
    compoundInterest(reserve, timestampElapsed) {
        const currentBorrowRate = this.calculateBorrowRate(reserve);
        const protocolTakeRate = new decimal_js_1.Decimal(reserve.config.reserveFactorRateBps.toString()).div(10000);
        const compoundedInterestRate = this.approximateCompoundedInterest(new decimal_js_1.Decimal(currentBorrowRate), timestampElapsed);
        const previousDebt = this.getBorrowedAmount(reserve);
        const newDebt = previousDebt.mul(compoundedInterestRate);
        const netNewDebt = newDebt.sub(previousDebt);
        const variableProtocolFee = netNewDebt.mul(protocolTakeRate);
        const newAccProtocolFees = variableProtocolFee.add(this.getAccumulatedProtocolFees(reserve));
        return {
            newDebt,
            netNewDebt,
            variableProtocolFee,
            newAccProtocolFees,
        };
    }
    approximateCompoundedInterest(rate, elapsedSlots) {
        const base = rate.div(utils_1.MILLISECONDS_PER_YEAR);
        switch (elapsedSlots) {
            case 0:
                return new decimal_js_1.Decimal(1);
            case 1:
                return base.add(1);
            case 2:
                return base.add(1).mul(base.add(1));
            case 3:
                return base.add(1).mul(base.add(1)).mul(base.add(1));
            case 4:
                // eslint-disable-next-line no-case-declarations
                const pow2 = base.add(1).mul(base.add(1));
                return pow2.mul(pow2);
        }
        const exp = elapsedSlots;
        const expMinus1 = exp - 1;
        const expMinus2 = exp - 2;
        const basePow2 = base.mul(base);
        const basePow3 = basePow2.mul(base);
        const firstTerm = base.mul(exp);
        const secondTerm = basePow2.mul(exp).mul(expMinus1).div(2);
        const thirdTerm = basePow3.mul(exp).mul(expMinus1).mul(expMinus2).div(6);
        return new decimal_js_1.Decimal(1).add(firstTerm).add(secondTerm).add(thirdTerm);
    }
}
exports.ElendMarketReserveCalculationOperation = ElendMarketReserveCalculationOperation;
//# sourceMappingURL=reserve-calculation.js.map