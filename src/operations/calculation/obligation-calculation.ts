import { Decimal as DecimalJs } from 'decimal.js';

import { IElendMarketObligationCalculationOperation } from '../../interfaces/operations';
import { Obligation, Reserve } from '../../types';
import { DetailBorrowedRes, DetailSuppliedRes } from '../../types/client';
import { ElendMarketQueryOperation } from '../query/query';

export class ElendMarketObligationCalculationOperation implements IElendMarketObligationCalculationOperation {
  private readonly queryOperation: ElendMarketQueryOperation;
  constructor(queryOperation: ElendMarketQueryOperation) {
    this.queryOperation = queryOperation;
  }

  getTotalSuppliedUSDValueObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
    return (obligation.deposits ?? []).reduce((acc, depositReserve) => {
      const reserve = associateReserves.get(depositReserve);
      if (!reserve) return acc.add(0);
      const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
      if (!obligationCollateral) return acc.add(0);
      const depositLiquidity = this.collateralToLiquidity(reserve, new DecimalJs(obligationCollateral?.depositedAmount ?? 0));
      const depositValue = depositLiquidity.div(Math.pow(10, reserve.liquidity.mintDecimal)).mul(reserveTokenPrice.get(depositReserve) || 0);

      return acc.add(depositValue);
    }, DecimalJs(0));
  }

  getTotalBorrowedUSDValueObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
    return (obligation.borrows ?? []).reduce((acc, borrowReserve) => {
      const reserve = associateReserves.get(borrowReserve);
      if (!reserve) return acc.add(0);
      const obligationLiquidity = obligation.obligationLiquidity.get(borrowReserve);
      if (!obligationLiquidity) return acc.add(0);
      const compoundInterest = reserve.liquidity.cumulativeBorrowRate.toDecimalJs().div(obligationLiquidity.cumulativeBorrowRate.toDecimalJs());

      const borrowValue = obligationLiquidity.borrowedAmount
        .toDecimalJs()
        .mul(compoundInterest)
        .div(Math.pow(10, reserve.liquidity.mintDecimal))
        .mul(reserveTokenPrice.get(borrowReserve) || 0);

      return acc.add(borrowValue);
    }, DecimalJs(0));
  }

  getDetailSuppliedOnMarketObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserves?: Reserve[]
  ): DetailSuppliedRes[] {
    const supplied = (obligation.deposits ?? []).filter(depositReserve => {
      return reserves && reserves.some(r => r.id === depositReserve);
    });

    if (supplied.length == 0) return [];

    return supplied.map(depositReserve => {
      const reserve = associateReserves.get(depositReserve);
      if (!reserve)
        return {
          reserve: depositReserve,
          tokenLiquidity: null,
          suppliedAmount: new DecimalJs(0),
          suppliedValue: new DecimalJs(0),
        };

      const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
      if (!obligationCollateral) {
        return {
          reserve: depositReserve,
          tokenLiquidity: null,
          suppliedAmount: new DecimalJs(0),
          suppliedValue: new DecimalJs(0),
        };
      }
      const depositLiquidity = this.collateralToLiquidity(reserve, new DecimalJs(obligationCollateral.depositedAmount)).div(
        Math.pow(10, reserve.liquidity.mintDecimal)
      );

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

  getDetailBorrowedOnMarketObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserves?: Reserve[]
  ): DetailBorrowedRes[] {
    const borrowed = (obligation.borrows ?? []).filter(borrowReserve => {
      return reserves ? reserves.some(r => r.id === borrowReserve) : false;
    });

    if (borrowed.length == 0) return [];

    return borrowed.map(borrowReserve => {
      const reserve = associateReserves.get(borrowReserve);
      if (!reserve)
        return {
          reserve: borrowReserve,
          tokenLiquidity: null,
          borrowedAmount: new DecimalJs(0),
          borrowedValue: new DecimalJs(0),
        };
      const obligationLiquidity = obligation.obligationLiquidity.get(borrowReserve);
      if (!obligationLiquidity) {
        return {
          reserve: borrowReserve,
          tokenLiquidity: null,
          borrowedAmount: new DecimalJs(0),
          borrowedValue: new DecimalJs(0),
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

  calculateCurrentHealthRatioObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
    const totalDepositedValue: DecimalJs = this.getTotalSuppliedUSDValueObligation(obligation, associateReserves, reserveTokenPrice);
    const totalDebtValue: DecimalJs = this.getTotalBorrowedUSDValueObligation(obligation, associateReserves, reserveTokenPrice);

    return totalDepositedValue.div(totalDebtValue);
  }

  calculateRemainingBorrowAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    borrowReserve: Reserve,
  ): DecimalJs {
    const remainingBorrowLiquidityReserve = new DecimalJs(borrowReserve.config.borrowLimit.toString()).sub(borrowReserve.liquidity.borrowedAmount.toDecimalJs());
    const availableLiquidityReserve = new DecimalJs(borrowReserve.liquidity.availableAmount);

    if (remainingBorrowLiquidityReserve.equals(new DecimalJs(0))) return new DecimalJs(0);
    let marketPrice = reserveTokenPrice.get(borrowReserve.id);
    if (!marketPrice) {
      marketPrice = borrowReserve.liquidity.marketPrice?.toDecimalJs?.() ?? new DecimalJs(0);
    }

    const totalAllowedBorrowValue = this.estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice);

    const totalBorrowFactorDebtValue = this.estimateTotalBorrowFactorDebtValue(obligation, associateReserves, reserveTokenPrice);

    const remainingBorrowValue = totalAllowedBorrowValue.sub(totalBorrowFactorDebtValue);
    const remainingBorrowAmount = remainingBorrowValue.div(marketPrice).mul(new DecimalJs(Math.pow(10, borrowReserve.liquidity.mintDecimal)));

    return DecimalJs.min(remainingBorrowAmount, remainingBorrowLiquidityReserve, availableLiquidityReserve);
  }

  calculateAllowedWithdrawAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserve: string,
    permissiveWithdrawMax: boolean
  ): DecimalJs {
    let highestAllowedBorrowValue: DecimalJs;
    let withdrawCollateralLtv: DecimalJs;
    const withdrawReserve = associateReserves.get(reserve);
    if (!withdrawReserve) throw new Error('Associate Reserves have not loaded yet');

    const withdrawObligationCollateral = obligation.deposits?.filter(depositReserve => (depositReserve = reserve))[0];

    if (!withdrawObligationCollateral || !withdrawReserve) return new DecimalJs(0);

    const marketPrice = reserveTokenPrice?.get(reserve) ? reserveTokenPrice.get(reserve) : withdrawReserve.liquidity.marketPrice.toDecimalJs();

    const availableLiquidityReserve = new DecimalJs(withdrawReserve.liquidity.availableAmount);

    const obligationCollateral = obligation.obligationCollateral.get(reserve);
    if (!obligationCollateral) {
      return new DecimalJs(0);
    }
    const depositedObligationCollateral = new DecimalJs(obligationCollateral.depositedAmount);
    const depositedObligationCollateralToLiquidity = this.collateralToLiquidity(withdrawReserve, depositedObligationCollateral);

    if (permissiveWithdrawMax) {
      highestAllowedBorrowValue = this.estimateUnhealthyBorrowValue(obligation, associateReserves, reserveTokenPrice);
      withdrawCollateralLtv = new DecimalJs(withdrawReserve.config.liquidationThresholdBps / 10_000);
    } else {
      highestAllowedBorrowValue = this.estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice);
      withdrawCollateralLtv = new DecimalJs(withdrawReserve.config.loanToValueBps / 10_000);
    }

    const totalBorrowFactorDebtValue = this.estimateTotalBorrowFactorDebtValue(obligation, associateReserves, reserveTokenPrice);

    if (highestAllowedBorrowValue.lessThanOrEqualTo(totalBorrowFactorDebtValue)) return new DecimalJs(0);

    if (withdrawCollateralLtv.eq(new DecimalJs(0))) {
      return new DecimalJs(obligationCollateral.depositedAmount).mul(marketPrice ?? new DecimalJs(0));
    }

    const allowedWithdrawAmount = DecimalJs.max(highestAllowedBorrowValue.sub(totalBorrowFactorDebtValue), new DecimalJs(0))
      .div(withdrawCollateralLtv)
      .div(marketPrice ?? new DecimalJs(0))
      .mul(new DecimalJs(Math.pow(10, withdrawReserve.liquidity.mintDecimal)));

    return DecimalJs.min(availableLiquidityReserve, depositedObligationCollateralToLiquidity, allowedWithdrawAmount);
  }

  private collateralToLiquidity(reserve: Reserve, collateralAmount: DecimalJs): DecimalJs {
    let exchangeRate: DecimalJs;
    const totalSupplyLiquidity = new DecimalJs(reserve.liquidity.availableAmount.toString())
      .add(reserve.liquidity.borrowedAmount.toDecimalJs())
      .sub(reserve.liquidity.accumulatedProtocolFees.toDecimalJs());
    const totalCollateralMint = new DecimalJs(reserve.collateral.mintTotalAmount);
    if (totalSupplyLiquidity.equals(0) || totalCollateralMint.equals(0)) {
      exchangeRate = new DecimalJs(1);
    } else {
      exchangeRate = totalCollateralMint.div(totalSupplyLiquidity);
    }

    return collateralAmount.div(exchangeRate);
  }

  private estimateAllowedBorrowValue(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
    return (
      obligation.deposits?.reduce((sum, depositReserve) => {
        const depositedReserve = associateReserves.get(depositReserve);
        if (!depositedReserve) {
          return sum;
        }

        const ltv = new DecimalJs(depositedReserve.config.loanToValueBps / 10_000);
        const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
        const marketPrice = reserveTokenPrice?.get(depositReserve)
          ? (reserveTokenPrice.get(depositReserve) ?? new DecimalJs(0))
          : depositedReserve.liquidity.marketPrice.toDecimalJs();

        if (!obligationCollateral) {
          return sum;
        }
        const depositedValue = this.collateralToLiquidity(depositedReserve, new DecimalJs(obligationCollateral.depositedAmount))
          .mul(marketPrice ?? new DecimalJs(0))
          .div(new DecimalJs(Math.pow(10, depositedReserve.liquidity.mintDecimal)))
          .mul(ltv);
        return sum.add(depositedValue);
      }, new DecimalJs(0)) || new DecimalJs(0)
    );
  }

  private estimateTotalBorrowFactorDebtValue(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
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

      const borrowFactor = new DecimalJs(borrowedReserve.config.borrowFactorBps / 10_000);
      const estimateBorrowedAmount = borrowObligation.borrowedAmount.toDecimalJs().mul(compoundInterest);
      const borrowFactorAdjustedValue = estimateBorrowedAmount
        .mul(borrowFactor)
        .mul(marketPrice ?? new DecimalJs(0))
        .div(new DecimalJs(Math.pow(10, borrowedReserve.liquidity.mintDecimal)));
      return sum.add(borrowFactorAdjustedValue);
    }, new DecimalJs(0));
  }

  private estimateUnhealthyBorrowValue(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>
  ): DecimalJs {
    return (
      obligation.deposits?.reduce((sum, depositReserve) => {
        const depositedReserve = associateReserves.get(depositReserve);

        if (!depositedReserve) {
          return sum;
        }
        const liquidationThresholdPct = new DecimalJs(depositedReserve.config.liquidationThresholdBps / 10_000);

        const marketPrice = reserveTokenPrice?.get(depositReserve)
          ? reserveTokenPrice.get(depositReserve)
          : depositedReserve.liquidity.marketPrice.toDecimalJs();

        const obligationCollateral = obligation.obligationCollateral.get(depositReserve);
        if (!obligationCollateral) {
          return sum;
        }
        const depositedValue = new DecimalJs(obligationCollateral.depositedAmount)
          .mul(marketPrice ?? new DecimalJs(0))
          .div(new DecimalJs(Math.pow(10, depositedReserve.liquidity.mintDecimal)))
          .mul(liquidationThresholdPct);
        return sum.add(depositedValue);
      }, new DecimalJs(0)) || new DecimalJs(0)
    );
  }
}
