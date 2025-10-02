import { Decimal as DecimalJs } from 'decimal.js';

import { IElendMarketReserveCalculationOperation } from '../../interfaces/operations';
import { Reserve } from '../../types';
import { DetailBorrowApyRes, DetailBorrowedRes, DetailSuppliedRes, DetailSupplyApyRes } from '../../types/client';
import { UserActionType } from '../../types/common';
import { Decimal, MILLISECONDS_PER_YEAR, calculateAPYFromAPR } from '../../utils';

export class ElendMarketReserveCalculationOperation implements IElendMarketReserveCalculationOperation {
  constructor() {}

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

  getDetailSupplyApy(reserve: Reserve, currentTimestampMs: number): DetailSupplyApyRes {
    const supplyApy = calculateAPYFromAPR(this.calculateSupplyAPR(reserve, currentTimestampMs));

    // const elendReward = new ElendReward(this.chain, this.connection, this.cluster);
    // const rewardConfig = this.rewards.get(reserveAddress.toBase58())?.get(RewardOption.Deposit);
    // const rewardIncentiveApy = rewardConfig
    //   ? await elendReward.calculateApyInterest(reserveAddress, RewardOption.Deposit, reserve, rewardConfig)
    //   : new Decimal(0);

    // const symbol = u8Array32ToString(reserve.config.tokenInfo.symbol);
    // const lstInterest = symbol == 'USD*'
    //   ? await this.getLSTInterestFromPerena(symbol) || 0
    //   : await this.getLSTInterestFromSanctum(symbol) || 0;

    return {
      // totalApy: new Decimal(supplyApy).add(rewardIncentiveApy).add(lstInterest),
      totalApy: new DecimalJs(supplyApy),
      breakdownApy: {
        supplyApy: new DecimalJs(supplyApy),
        rewardIncentiveApy: new DecimalJs(0),
        lstInterest: 0,
      },
    };
  }

  getDetailBorrowApy(reserve: Reserve, currentTimestampMs: number): DetailBorrowApyRes {
    const borrowApy = calculateAPYFromAPR(this.calculateBorrowAPR(reserve, currentTimestampMs));

    // const elendReward = new ElendReward(this.chain, this.connection, this.cluster);
    // const rewardConfig = this.rewards.get(reserveAddress.toBase58())?.get(RewardOption.Borrow);
    // const rewardIncentiveApy = rewardConfig
    //   ? await elendReward.calculateApyInterest(reserveAddress, RewardOption.Borrow, reserve, rewardConfig)
    //   : new Decimal(0);

    return {
      // totalApy: new DecimalJs(borrowApy).sub(rewardIncentiveApy),
      totalApy: new DecimalJs(borrowApy),
      breakdownApy: {
        borrowApy: new DecimalJs(borrowApy),
        rewardIncentiveApy: new DecimalJs(0),
      },
    };
  }

  totalSupplyAPYWithNewAvailableSupplyAmount(
    reserve: Reserve,
    newAvailableAmount: bigint,
    currentTimestampMs: number,
    userAction: UserActionType
  ): DecimalJs {
    const reserveData = reserve;
    const actionAmount =
      userAction == UserActionType.Deposit
        ? new DecimalJs(newAvailableAmount.toString()).sub(new DecimalJs(reserveData.liquidity.availableAmount.toString())).toNumber()
        : new DecimalJs(reserveData.liquidity.availableAmount.toString()).sub(new DecimalJs(newAvailableAmount.toString())).toNumber();
    reserveData.liquidity.availableAmount = newAvailableAmount;

    const supplyApy = calculateAPYFromAPR(this.calculateSupplyAPR(reserveData, currentTimestampMs));

    // const elendReward = new ElendReward(this.chain, this.connection, this.cluster);
    // const rewardConfig = this.rewards.get(reserveData.toBase58())?.get(RewardOption.Deposit);
    // const rewardIncentiveApy = rewardConfig
    //   ? await elendReward.estimateNewApyInterest(reserveData, RewardOption.Deposit, actionAmount, userAction, reserveData, rewardConfig)
    //   : new Decimal(0);

    // const symbol = u8Array32ToString(reserveData.config.tokenInfo.symbol);
    // const lstInterest = symbol == 'USD*'
    //   ? await this.getLSTInterestFromPerena(symbol) || 0
    //   : await this.getLSTInterestFromSanctum(symbol) || 0;

    // return new DecimalJs(supplyApy).add(rewardIncentiveApy).add(lstInterest);
    return new DecimalJs(supplyApy);
  }

  totalBorrowAPYWithNewBorrowedAmount(
    reserve: Reserve,
    newAvailableLiquidity: bigint,
    newBorrowedAmount: Decimal,
    currentTimestampMs: number,
    userAction: UserActionType
  ): DecimalJs {
    const reserveData = reserve;
    // const actionAmount = userAction == UserActionType.Borrow
    //   ? new Fraction(newBorrowedAmountSf).toDecimal().sub(new Fraction(reserveData.liquidity.borrowedAmountSf).toDecimal()).toNumber()
    //   : new Fraction(reserveData.liquidity.borrowedAmountSf).toDecimal().sub(new Fraction(newBorrowedAmountSf).toDecimal()).toNumber()
    reserveData.liquidity.availableAmount = newAvailableLiquidity;
    reserveData.liquidity.borrowedAmount = newBorrowedAmount;

    const borrowApy = calculateAPYFromAPR(this.calculateBorrowAPR(reserveData, currentTimestampMs));

    // const elendReward = new ElendReward(this.chain, this.connection, this.cluster);
    // const rewardConfig = this.rewards.get(reserve.toBase58())?.get(RewardOption.Borrow);
    // const rewardIncentiveApy = rewardConfig
    //   ? await elendReward.estimateNewApyInterest(reserve, RewardOption.Borrow, actionAmount, userAction, reserveData, rewardConfig)
    //   : new Decimal(0);

    // return new Decimal(borrowApy).sub(rewardIncentiveApy);
    return new DecimalJs(borrowApy);
  }

  getTotalSupply(reserve: Reserve): DecimalJs {
    return this.getLiquidityAvailableAmount(reserve).add(this.getBorrowedAmount(reserve)).sub(this.getAccumulatedProtocolFees(reserve));
  }

  getBorrowedAmount(reserve: Reserve): DecimalJs {
    return reserve.liquidity.borrowedAmount.toDecimalJs();
  }

  getLiquidityAvailableAmount(reserve: Reserve): DecimalJs {
    return new DecimalJs(reserve.liquidity.availableAmount.toString());
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

  private calculateSupplyAPR(reserve: Reserve, timestampMs: number) {
    const currentUtilization = this.calculateUtilizationRatio(reserve);
    const borrowRate = this.calculateBorrowRate(reserve, timestampMs);
    const protocolTakeRatePct = 1 - reserve.config.reserveFactorRateBps / 10_000;
    return currentUtilization * borrowRate * protocolTakeRatePct;
  }

  private calculateBorrowAPR(reserve: Reserve, timestampMs?: number) {
    return this.calculateBorrowRate(reserve, timestampMs);
  }

  private calculateBorrowRate(reserve: Reserve, timestampMs?: number) {
    const estimatedCurrentUtilization = this.calculateUtilizationRatio(reserve, timestampMs);
    return this.getBorrowRate(reserve, estimatedCurrentUtilization);
  }

  private getEstimatedDebtAndSupply(
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

  private getBorrowRate(reserve: Reserve, utilizationRate: number): number {
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
