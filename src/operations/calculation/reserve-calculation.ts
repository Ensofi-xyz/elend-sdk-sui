import { Decimal as DecimalJs } from 'decimal.js';
import { cloneDeep } from 'lodash';

import { IElendMarketReserveCalculationOperation } from '../../interfaces/operations';
import { Reserve } from '../../types';
import { DetailBorrowApyRes, DetailBorrowedRes, DetailSuppliedRes, DetailSupplyApyRes } from '../../types/client';
import { RewardOption, UserActionType } from '../../types/common';
import { Decimal, MILLISECONDS_PER_YEAR, calculateAPYFromAPR } from '../../utils';
import { LSTAsset, getHaSuiLstInterest } from '../../utils/lst';
import { ElendMarketQueryOperation } from '../query/query';
import { ElendMarketRewardCalculationOperation } from './reward-calculation';

export class ElendMarketReserveCalculationOperation implements IElendMarketReserveCalculationOperation {
  private readonly queryOperation: ElendMarketQueryOperation;
  constructor(queryOperation: ElendMarketQueryOperation) {
    this.queryOperation = queryOperation;
  }

  getTotalSuppliedUSDValueOnMarket(reserves: Reserve[]): DecimalJs {
    return reserves.reduce((acc, reserve) => {
      const totalSupplyUSDValue = this.getTotalSupply(reserve)
        .div(Math.pow(10, this.getMintDecimals(reserve)))
        .mul(this.getReserveMarketPrice(reserve));

      return acc.add(totalSupplyUSDValue);
    }, new DecimalJs(0));
  }

  getTotalBorrowedUSDValueOnMarket(reserves: Reserve[]): DecimalJs {
    return reserves.reduce((acc, reserve) => {
      const totalBorrowUSDValue = this.getBorrowedAmount(reserve)
        .div(Math.pow(10, this.getMintDecimals(reserve)))
        .mul(this.getReserveMarketPrice(reserve));

      return acc.add(totalBorrowUSDValue);
    }, new DecimalJs(0));
  }

  getDetailSuppliedOnMarket(reserves: Reserve[]): DetailSuppliedRes[] {
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

  getDetailBorrowedOnMarket(reserves: Reserve[]): DetailBorrowedRes[] {
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

  async getDetailSupplyApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailSupplyApyRes> {
    const supplyApy = calculateAPYFromAPR(this.calculateSupplyAPR(reserve, currentTimestampMs));
    const rewardCalculation = new ElendMarketRewardCalculationOperation(this.queryOperation);
    const rewardIncentiveApys = await rewardCalculation.calculateIncentiveRewardApyInterest(reserve, marketType, RewardOption.Deposit);
    const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new DecimalJs(0));

    let lstInterest = new DecimalJs(0);
    if (reserve.config.tokenInfo.symbol === LSTAsset.HASUI) {
      lstInterest = await getHaSuiLstInterest();
    }
    return {
      totalApy: new DecimalJs(supplyApy).add(totalIncentiveApy).add(lstInterest),
      breakdownApy: {
        supplyApy: new DecimalJs(supplyApy),
        rewardIncentiveApy: rewardIncentiveApys,
        lstInterest: lstInterest.toNumber(),
      },
    };
  }

  async getDetailBorrowApy(reserve: Reserve, marketType: string, currentTimestampMs: number): Promise<DetailBorrowApyRes> {
    const borrowApy = calculateAPYFromAPR(this.calculateBorrowAPR(reserve, currentTimestampMs));
    const rewardCalculation = new ElendMarketRewardCalculationOperation(this.queryOperation);
    const rewardIncentiveApys = await rewardCalculation.calculateIncentiveRewardApyInterest(reserve, marketType, RewardOption.Borrow);
    const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new DecimalJs(0));
    return {
      totalApy: new DecimalJs(borrowApy).sub(totalIncentiveApy),
      breakdownApy: {
        borrowApy: new DecimalJs(borrowApy),
        rewardIncentiveApy: rewardIncentiveApys,
      },
    };
  }

  async totalSupplyAPYWithNewAvailableSupplyAmount(
    reserve: Reserve,
    marketType: string,
    newAvailableAmount: bigint,
    currentTimestampMs: number,
    userAction: UserActionType
  ): Promise<DecimalJs> {
    const reserveData = cloneDeep(reserve);
    const actionAmount =
      userAction == UserActionType.Deposit
        ? new DecimalJs(newAvailableAmount.toString()).sub(new DecimalJs(reserveData.liquidity.availableAmount.toString())).toNumber()
        : new DecimalJs(reserveData.liquidity.availableAmount.toString()).sub(new DecimalJs(newAvailableAmount.toString())).toNumber();
    reserveData.liquidity.availableAmount = newAvailableAmount;

    const supplyApy = calculateAPYFromAPR(this.calculateSupplyAPR(reserveData, currentTimestampMs));

    const rewardCalculation = new ElendMarketRewardCalculationOperation(this.queryOperation);
    const rewardIncentiveApys = await rewardCalculation.estimateIncentiveRewardNewApyInterest(
      reserve,
      marketType,
      RewardOption.Deposit,
      actionAmount,
      userAction
    );
    const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new DecimalJs(0));

    let lstInterest = new DecimalJs(0);
    if (reserve.config.tokenInfo.symbol === LSTAsset.HASUI) {
      lstInterest = await getHaSuiLstInterest();
    }

    return new DecimalJs(supplyApy).add(totalIncentiveApy).add(lstInterest);
  }

  async totalBorrowAPYWithNewBorrowedAmount(
    reserve: Reserve,
    marketType: string,
    newAvailableLiquidity: bigint,
    newBorrowedAmount: Decimal,
    currentTimestampMs: number,
    userAction: UserActionType
  ): Promise<DecimalJs> {
    const reserveClone = cloneDeep(reserve);
    const actionAmount =
      userAction == UserActionType.Borrow
        ? newBorrowedAmount.toDecimalJs().sub(reserveClone.liquidity.borrowedAmount.toDecimalJs()).toNumber()
        : reserveClone.liquidity.borrowedAmount.toDecimalJs().sub(newBorrowedAmount.toDecimalJs()).toNumber();
    reserveClone.liquidity.availableAmount = newAvailableLiquidity;
    reserveClone.liquidity.borrowedAmount = newBorrowedAmount;

    const borrowApy = calculateAPYFromAPR(this.calculateBorrowAPR(reserveClone, currentTimestampMs));

    const rewardCalculation = new ElendMarketRewardCalculationOperation(this.queryOperation);
    const rewardIncentiveApys = await rewardCalculation.estimateIncentiveRewardNewApyInterest(
      reserve,
      marketType,
      RewardOption.Borrow,
      actionAmount,
      userAction
    );
    const totalIncentiveApy = Array.from(rewardIncentiveApys.values()).reduce((acc, apy) => acc.add(apy), new DecimalJs(0));
    return new DecimalJs(borrowApy).sub(totalIncentiveApy);
  }

  getTotalSupply(reserve: Reserve): DecimalJs {
    return this.getLiquidityAvailableAmount(reserve).add(this.getBorrowedAmount(reserve)).sub(this.getAccumulatedProtocolFees(reserve));
  }

  getBorrowedAmount(reserve: Reserve): DecimalJs {
    return reserve.liquidity.borrowedAmount.toDecimalJs();
  }

  getTotalMintCollateral(reserve: Reserve): DecimalJs {
    return new DecimalJs(reserve.collateral.mintTotalAmount);
  }

  getLiquidityAvailableAmount(reserve: Reserve): DecimalJs {
    return new DecimalJs(reserve.liquidity.availableAmount.toString());
  }

  getCumulativeBorrowRate(reserve: Reserve): DecimalJs {
    return reserve.liquidity.cumulativeBorrowRate.toDecimalJs();
  }

  getAccumulatedProtocolFees(reserve: Reserve): DecimalJs {
    return reserve.liquidity.accumulatedProtocolFees.toDecimalJs();
  }

  getReserveMarketPrice(reserve: Reserve): DecimalJs {
    return reserve.liquidity.marketPrice.toDecimalJs();
  }

  getMintDecimals(reserve: Reserve): number {
    return reserve.liquidity.mintDecimal;
  }

  calculateUtilizationRatio(reserve: Reserve, slot?: number): number {
    if (!slot) {
      const totalBorrows = this.getBorrowedAmount(reserve);
      const totalSupply = this.getTotalSupply(reserve);
      if (totalSupply.eq(0)) {
        return 0;
      }
      return totalBorrows.dividedBy(totalSupply).toNumber();
    } else {
      const { totalBorrow: estimatedTotalBorrowed, totalSupply: estimatedTotalSupply } = this.getEstimatedDebtAndSupply(reserve, slot);
      if (estimatedTotalSupply.eq(0)) {
        return 0;
      }

      return estimatedTotalBorrowed.dividedBy(estimatedTotalSupply).toNumber();
    }
  }

  calculateSupplyAPR(reserve: Reserve, timestampMs: number) {
    const currentUtilization = this.calculateUtilizationRatio(reserve);
    const borrowRate = this.calculateBorrowRate(reserve, timestampMs);
    const protocolTakeRatePct = 1 - reserve.config.reserveFactorRateBps / 10_000;
    return currentUtilization * borrowRate * protocolTakeRatePct;
  }

  calculateBorrowAPR(reserve: Reserve, timestampMs?: number) {
    return this.calculateBorrowRate(reserve, timestampMs);
  }

  calculateBorrowRate(reserve: Reserve, timestampMs?: number) {
    const estimatedCurrentUtilization = this.calculateUtilizationRatio(reserve, timestampMs);
    return this.getBorrowRate(reserve, estimatedCurrentUtilization);
  }

  getEstimatedDebtAndSupply(
    reserve: Reserve,
    timestampMs: number
  ): {
    totalBorrow: DecimalJs;
    totalSupply: DecimalJs;
  } {
    try {
      const timestampElapsed = Math.max(timestampMs - new DecimalJs(reserve.lastUpdate.timestampMs.toString()).toNumber(), 0);
      let totalBorrow: DecimalJs;
      let totalSupply: DecimalJs;
      if (timestampElapsed === 0) {
        totalBorrow = this.getBorrowedAmount(reserve);
        totalSupply = this.getTotalSupply(reserve);
      } else {
        const { newDebt, newAccProtocolFees } = this.compoundInterest(reserve, timestampElapsed);
        const newTotalSupply = this.getLiquidityAvailableAmount(reserve).add(newDebt).sub(newAccProtocolFees);
        totalBorrow = newDebt;
        totalSupply = newTotalSupply;
      }
      return { totalBorrow, totalSupply };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  getBorrowRate(reserve: Reserve, utilizationRate: number): number {
    const baseBorrowRate = reserve.config.baseFixedInterestRateBps / 10_000;
    const utilizationOptimal = reserve.config.utilizationOptimalBps / 10_000;
    const maxUtilization = reserve.config.utilizationLimitBlockBorrowingAboveBps / 10_000;
    const borrowRateAtOptimalUtilization = reserve.config.borrowRateAtOptimalBps / 10_000;
    const maxBorrowRate = reserve.config.maxInterestRateBps / 10_000;

    const multiplier = (borrowRateAtOptimalUtilization - baseBorrowRate) / utilizationOptimal;

    if (utilizationRate === utilizationOptimal) {
      return borrowRateAtOptimalUtilization;
    } else if (utilizationRate < utilizationOptimal) {
      return baseBorrowRate + multiplier * utilizationRate;
    } else {
      const jumpRateMultiplier = (maxBorrowRate - borrowRateAtOptimalUtilization) / (maxUtilization - utilizationOptimal);

      return borrowRateAtOptimalUtilization + jumpRateMultiplier * (utilizationRate - utilizationOptimal);
    }
  }

  getEstimatedBorrowedAmount(reserve: Reserve, timestampMs: number): DecimalJs {
    return this.getBorrowedAmount(reserve).mul(this.getEstimatedCumulativeBorrowRate(reserve, timestampMs));
  }

  getEstimatedCumulativeBorrowRate(reserve: Reserve, timestampMs: number): DecimalJs {
    const currentBorrowRate = new DecimalJs(this.calculateBorrowAPR(reserve, timestampMs));
    const elapsedTimestamp = Math.max(timestampMs - Number(reserve.lastUpdate.timestampMs), 0);

    const compoundInterest = this.approximateCompoundedInterest(currentBorrowRate, elapsedTimestamp);

    const previousCumulativeBorrowRate = this.getCumulativeBorrowRate(reserve);

    return previousCumulativeBorrowRate.mul(compoundInterest);
  }

  private compoundInterest(
    reserve: Reserve,
    timestampElapsed: number
  ): {
    newDebt: DecimalJs;
    netNewDebt: DecimalJs;
    variableProtocolFee: DecimalJs;
    newAccProtocolFees: DecimalJs;
  } {
    const currentBorrowRate = this.calculateBorrowRate(reserve);
    const protocolTakeRate = new DecimalJs(reserve.config.reserveFactorRateBps.toString()).div(10000);

    const compoundedInterestRate = this.approximateCompoundedInterest(new DecimalJs(currentBorrowRate), timestampElapsed);

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

  private approximateCompoundedInterest(rate: DecimalJs, elapsedSlots: number): DecimalJs {
    const base = rate.div(MILLISECONDS_PER_YEAR);
    switch (elapsedSlots) {
      case 0:
        return new DecimalJs(1);
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

    return new DecimalJs(1).add(firstTerm).add(secondTerm).add(thirdTerm);
  }
}
