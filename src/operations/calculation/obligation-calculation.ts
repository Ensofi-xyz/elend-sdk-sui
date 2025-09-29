import { Decimal as DecimalJs } from 'decimal.js';

import { IElendMarketObligationCalculationOperation } from '../../interfaces/operations';
import { Obligation, Reserve } from '../../types';
import { DetailBorrowedRes, DetailSuppliedRes } from '../../types/client';

export class ElendMarketObligationCalculationOperation implements IElendMarketObligationCalculationOperation {
  constructor() {}

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
    borrowReserve: string
  ): DecimalJs {
    const reserve = associateReserves.get(borrowReserve);
    if (!reserve) {
      return new DecimalJs(0);
    }
    const remainingBorrowLiquidityReserve = new DecimalJs(reserve.config.borrowLimit.toString()).sub(reserve.liquidity.borrowedAmount.toDecimalJs());
    const availableLiquidityReserve = new DecimalJs(reserve.liquidity.availableAmount);

    if (remainingBorrowLiquidityReserve.equals(new DecimalJs(0))) return new DecimalJs(0);
    let marketPrice = reserveTokenPrice.get(borrowReserve);
    if (!marketPrice) {
      marketPrice = reserve.liquidity.marketPrice?.toDecimalJs?.() ?? new DecimalJs(0);
    }

    const totalAllowedBorrowValue = this.estimateAllowedBorrowValue(obligation, associateReserves, reserveTokenPrice);

    const totalBorrowFactorDebtValue = this.estimateTotalBorrowFactorDebtValue();

    const remainingBorrowValue = totalAllowedBorrowValue.sub(totalBorrowFactorDebtValue);
    const remainingBorrowAmount = remainingBorrowValue.div(marketPrice).mul(new DecimalJs(Math.pow(10, reserve.liquidity.mintDecimal)));

    return DecimalJs.min(remainingBorrowAmount, remainingBorrowLiquidityReserve, availableLiquidityReserve);
  }

  calculateAllowedWithdrawAmount(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    borrowReserve: string
  ): DecimalJs {
    throw new Error('Method not implemented.');
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
          .mul(marketPrice)
          .div(new DecimalJs(Math.pow(10, depositedReserve.liquidity.mintDecimal)))
          .mul(ltv);
        return sum.add(depositedValue);
      }, new DecimalJs(0)) || new DecimalJs(0)
    );
  }
}
