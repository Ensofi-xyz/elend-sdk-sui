"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketObligationCalculationOperation = void 0;
const decimal_js_1 = require("decimal.js");
class ElendMarketObligationCalculationOperation {
    constructor(queryOperation) {
        this.queryOperation = queryOperation;
    }
    getTotalSuppliedUSDValueObligation(obligation, associateReserves, reserveTokenPrice) {
        return (obligation.deposits ?? []).reduce((acc, depositReserve) => {
            const reserve = associateReserves.get(depositReserve);
            if (!reserve)
                return acc.add(0);
            const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
            if (!obligationCollateral)
                return acc.add(0);
            const depositLiquidity = this.collateralToLiquidity(reserve, new decimal_js_1.Decimal(obligationCollateral?.depositedAmount ?? 0));
            const depositValue = depositLiquidity.div(Math.pow(10, reserve.liquidity.mintDecimal)).mul(reserveTokenPrice.get(depositReserve) || 0);
            return acc.add(depositValue);
        }, (0, decimal_js_1.Decimal)(0));
    }
    getTotalBorrowedUSDValueObligation(obligation, associateReserves, reserveTokenPrice) {
        return (obligation.borrows ?? []).reduce((acc, borrowReserve) => {
            const reserve = associateReserves.get(borrowReserve);
            if (!reserve)
                return acc.add(0);
            const obligationLiquidity = obligation.obligationLiquidity.get(borrowReserve);
            if (!obligationLiquidity)
                return acc.add(0);
            const compoundInterest = reserve.liquidity.cumulativeBorrowRate.toDecimalJs().div(obligationLiquidity.cumulativeBorrowRate.toDecimalJs());
            const borrowValue = obligationLiquidity.borrowedAmount
                .toDecimalJs()
                .mul(compoundInterest)
                .div(Math.pow(10, reserve.liquidity.mintDecimal))
                .mul(reserveTokenPrice.get(borrowReserve) || 0);
            return acc.add(borrowValue);
        }, (0, decimal_js_1.Decimal)(0));
    }
    getDetailSuppliedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, reserves) {
        const supplied = (obligation.deposits ?? []).filter(depositReserve => {
            return reserves && reserves.some(r => r.id === depositReserve);
        });
        if (supplied.length == 0)
            return [];
        return supplied.map(depositReserve => {
            const reserve = associateReserves.get(depositReserve);
            if (!reserve)
                return {
                    reserve: depositReserve,
                    tokenLiquidity: null,
                    suppliedAmount: new decimal_js_1.Decimal(0),
                    suppliedValue: new decimal_js_1.Decimal(0),
                };
            const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
            if (!obligationCollateral) {
                return {
                    reserve: depositReserve,
                    tokenLiquidity: null,
                    suppliedAmount: new decimal_js_1.Decimal(0),
                    suppliedValue: new decimal_js_1.Decimal(0),
                };
            }
            const depositLiquidity = this.collateralToLiquidity(reserve, new decimal_js_1.Decimal(obligationCollateral.depositedAmount)).div(Math.pow(10, reserve.liquidity.mintDecimal));
            const depositValue = depositLiquidity.mul(reserveTokenPrice.get(depositReserve) || 0);
            return {
                reserve: depositReserve,
                tokenLiquidity: {
                    symbol: reserve.config.tokenInfo.symbol,
                    decimals: reserve.liquidity.mintDecimal,
                    tokenType: reserve.liquidity.mintTokenType,
                },
                suppliedAmount: depositLiquidity,
                suppliedValue: depositValue,
            };
        });
    }
    getDetailBorrowedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, reserves) {
        const borrowed = (obligation.borrows ?? []).filter(borrowReserve => {
            return reserves ? reserves.some(r => r.id === borrowReserve) : false;
        });
        if (borrowed.length == 0)
            return [];
        return borrowed.map(borrowReserve => {
            const reserve = associateReserves.get(borrowReserve);
            if (!reserve)
                return {
                    reserve: borrowReserve,
                    tokenLiquidity: null,
                    borrowedAmount: new decimal_js_1.Decimal(0),
                    borrowedValue: new decimal_js_1.Decimal(0),
                };
            const obligationLiquidity = obligation.obligationLiquidity.get(borrowReserve);
            if (!obligationLiquidity) {
                return {
                    reserve: borrowReserve,
                    tokenLiquidity: null,
                    borrowedAmount: new decimal_js_1.Decimal(0),
                    borrowedValue: new decimal_js_1.Decimal(0),
                };
            }
            const compoundInterest = reserve.liquidity.cumulativeBorrowRate.toDecimalJs().div(obligationLiquidity.cumulativeBorrowRate.toDecimalJs());
            const borrowLiquidity = obligationLiquidity.borrowedAmount.toDecimalJs().mul(compoundInterest).div(Math.pow(10, reserve.liquidity.mintDecimal));
            const borrowValue = borrowLiquidity.mul(reserveTokenPrice.get(borrowReserve) || 0);
            return {
                reserve: borrowReserve,
                tokenLiquidity: {
                    symbol: reserve.config.tokenInfo.symbol,
                    decimals: reserve.liquidity.mintDecimal,
                    tokenType: reserve.liquidity.mintTokenType,
                },
                borrowedAmount: borrowLiquidity,
                borrowedValue: borrowValue,
            };
        });
    }
    calculateCurrentHealthRatioObligation(obligation, associateReserves, reserveTokenPrice) {
        const totalDepositedValue = this.getTotalSuppliedUSDValueObligation(obligation, associateReserves, reserveTokenPrice);
        const totalDebtValue = this.getTotalBorrowedUSDValueObligation(obligation, associateReserves, reserveTokenPrice);
        return totalDepositedValue.div(totalDebtValue);
    }
    calculateRemainingBorrowAmount(obligation, associateReserves, reserveTokenPrice, borrowReserve) {
        const remainingBorrowLiquidityReserve = new decimal_js_1.Decimal(borrowReserve.config.borrowLimit.toString()).sub(borrowReserve.liquidity.borrowedAmount.toDecimalJs());
        const availableLiquidityReserve = new decimal_js_1.Decimal(borrowReserve.liquidity.availableAmount);
        if (remainingBorrowLiquidityReserve.equals(new decimal_js_1.Decimal(0)))
            return new decimal_js_1.Decimal(0);
        let marketPrice = reserveTokenPrice.get(borrowReserve.id);
        if (!marketPrice) {
            marketPrice = borrowReserve.liquidity.marketPrice?.toDecimalJs?.() ?? new decimal_js_1.Decimal(0);
        }
        const totalAllowedBorrowValue = this.estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice);
        const totalBorrowFactorDebtValue = this.estimateTotalBorrowFactorDebtValue(obligation, associateReserves, reserveTokenPrice);
        const remainingBorrowValue = totalAllowedBorrowValue.sub(totalBorrowFactorDebtValue);
        const remainingBorrowAmount = remainingBorrowValue.div(marketPrice).mul(new decimal_js_1.Decimal(Math.pow(10, borrowReserve.liquidity.mintDecimal)));
        return decimal_js_1.Decimal.min(remainingBorrowAmount, remainingBorrowLiquidityReserve, availableLiquidityReserve);
    }
    calculateAllowedWithdrawAmount(obligation, associateReserves, reserveTokenPrice, reserve, permissiveWithdrawMax) {
        let highestAllowedBorrowValue;
        let withdrawCollateralLtv;
        const withdrawReserve = associateReserves.get(reserve);
        if (!withdrawReserve)
            throw new Error('Associate Reserves have not loaded yet');
        const withdrawObligationCollateral = obligation.deposits?.filter(depositReserve => (depositReserve = reserve))[0];
        if (!withdrawObligationCollateral || !withdrawReserve)
            return new decimal_js_1.Decimal(0);
        const marketPrice = reserveTokenPrice?.get(reserve) ? reserveTokenPrice.get(reserve) : withdrawReserve.liquidity.marketPrice.toDecimalJs();
        const availableLiquidityReserve = new decimal_js_1.Decimal(withdrawReserve.liquidity.availableAmount);
        const obligationCollateral = obligation.obligationCollateral.get(reserve);
        if (!obligationCollateral) {
            return new decimal_js_1.Decimal(0);
        }
        const depositedObligationCollateral = new decimal_js_1.Decimal(obligationCollateral.depositedAmount);
        const depositedObligationCollateralToLiquidity = this.collateralToLiquidity(withdrawReserve, depositedObligationCollateral);
        if (permissiveWithdrawMax) {
            highestAllowedBorrowValue = this.estimateUnhealthyBorrowValue(obligation, associateReserves, reserveTokenPrice);
            withdrawCollateralLtv = new decimal_js_1.Decimal(withdrawReserve.config.liquidationThresholdBps / 10000);
        }
        else {
            highestAllowedBorrowValue = this.estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice);
            withdrawCollateralLtv = new decimal_js_1.Decimal(withdrawReserve.config.loanToValueBps / 10000);
        }
        const totalBorrowFactorDebtValue = this.estimateTotalBorrowFactorDebtValue(obligation, associateReserves, reserveTokenPrice);
        if (highestAllowedBorrowValue.lessThanOrEqualTo(totalBorrowFactorDebtValue))
            return new decimal_js_1.Decimal(0);
        if (withdrawCollateralLtv.eq(new decimal_js_1.Decimal(0))) {
            return new decimal_js_1.Decimal(obligationCollateral.depositedAmount).mul(marketPrice ?? new decimal_js_1.Decimal(0));
        }
        const allowedWithdrawAmount = decimal_js_1.Decimal.max(highestAllowedBorrowValue.sub(totalBorrowFactorDebtValue), new decimal_js_1.Decimal(0))
            .div(withdrawCollateralLtv)
            .div(marketPrice ?? new decimal_js_1.Decimal(0))
            .mul(new decimal_js_1.Decimal(Math.pow(10, withdrawReserve.liquidity.mintDecimal)));
        return decimal_js_1.Decimal.min(availableLiquidityReserve, depositedObligationCollateralToLiquidity, allowedWithdrawAmount);
    }
    collateralToLiquidity(reserve, collateralAmount) {
        let exchangeRate;
        const totalSupplyLiquidity = new decimal_js_1.Decimal(reserve.liquidity.availableAmount.toString())
            .add(reserve.liquidity.borrowedAmount.toDecimalJs())
            .sub(reserve.liquidity.accumulatedProtocolFees.toDecimalJs());
        const totalCollateralMint = new decimal_js_1.Decimal(reserve.collateral.mintTotalAmount);
        if (totalSupplyLiquidity.equals(0) || totalCollateralMint.equals(0)) {
            exchangeRate = new decimal_js_1.Decimal(1);
        }
        else {
            exchangeRate = totalCollateralMint.div(totalSupplyLiquidity);
        }
        return collateralAmount.div(exchangeRate);
    }
    estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice) {
        return (obligation.deposits?.reduce((sum, depositReserve) => {
            const depositedReserve = associateReserves.get(depositReserve);
            if (!depositedReserve) {
                return sum;
            }
            const ltv = new decimal_js_1.Decimal(depositedReserve.config.loanToValueBps / 10000);
            const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
            const marketPrice = reserveTokenPrice?.get(depositReserve)
                ? (reserveTokenPrice.get(depositReserve) ?? new decimal_js_1.Decimal(0))
                : depositedReserve.liquidity.marketPrice.toDecimalJs();
            if (!obligationCollateral) {
                return sum;
            }
            const depositedValue = this.collateralToLiquidity(depositedReserve, new decimal_js_1.Decimal(obligationCollateral.depositedAmount))
                .mul(marketPrice ?? new decimal_js_1.Decimal(0))
                .div(new decimal_js_1.Decimal(Math.pow(10, depositedReserve.liquidity.mintDecimal)))
                .mul(ltv);
            return sum.add(depositedValue);
        }, new decimal_js_1.Decimal(0)) || new decimal_js_1.Decimal(0));
    }
    estimateTotalBorrowFactorDebtValue(obligation, associateReserves, reserveTokenPrice) {
        return obligation.borrows.reduce((sum, borrowRerserve) => {
            const borrowedReserve = associateReserves.get(borrowRerserve);
            const borrowObligation = obligation.obligationLiquidity.get(borrowRerserve);
            if (!borrowedReserve || !borrowObligation) {
                return sum;
            }
            const compoundInterest = borrowedReserve.liquidity.cumulativeBorrowRate.toDecimalJs().div(borrowObligation.cumulativeBorrowRate.toDecimalJs());
            const marketPrice = reserveTokenPrice?.get(borrowRerserve)
                ? reserveTokenPrice.get(borrowRerserve)
                : borrowedReserve.liquidity.marketPrice?.toDecimalJs?.();
            const borrowFactor = new decimal_js_1.Decimal(borrowedReserve.config.borrowFactorBps / 10000);
            const estimateBorrowedAmount = borrowObligation.borrowedAmount.toDecimalJs().mul(compoundInterest);
            const borrowFactorAdjustedValue = estimateBorrowedAmount
                .mul(borrowFactor)
                .mul(marketPrice ?? new decimal_js_1.Decimal(0))
                .div(new decimal_js_1.Decimal(Math.pow(10, borrowedReserve.liquidity.mintDecimal)));
            return sum.add(borrowFactorAdjustedValue);
        }, new decimal_js_1.Decimal(0));
    }
    estimateUnhealthyBorrowValue(obligation, associateReserves, reserveTokenPrice) {
        return (obligation.deposits?.reduce((sum, depositReserve) => {
            const depositedReserve = associateReserves.get(depositReserve);
            if (!depositedReserve) {
                return sum;
            }
            const liquidationThresholdPct = new decimal_js_1.Decimal(depositedReserve.config.liquidationThresholdBps / 10000);
            const marketPrice = reserveTokenPrice?.get(depositReserve)
                ? reserveTokenPrice.get(depositReserve)
                : depositedReserve.liquidity.marketPrice.toDecimalJs();
            const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
            if (!obligationCollateral) {
                return sum;
            }
            const depositedValue = new decimal_js_1.Decimal(obligationCollateral.depositedAmount)
                .mul(marketPrice ?? new decimal_js_1.Decimal(0))
                .div(new decimal_js_1.Decimal(Math.pow(10, depositedReserve.liquidity.mintDecimal)))
                .mul(liquidationThresholdPct);
            return sum.add(depositedValue);
        }, new decimal_js_1.Decimal(0)) || new decimal_js_1.Decimal(0));
    }
}
exports.ElendMarketObligationCalculationOperation = ElendMarketObligationCalculationOperation;
//# sourceMappingURL=obligation-calculation.js.map