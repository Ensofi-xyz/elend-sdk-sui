import { Decimal as DecimalJs } from 'decimal.js';

import { IElendMarketRewardCalculationOperation } from '../../interfaces/operations';
import { DetailIncentiveRewardRes, Obligation, Reserve, RewardConfig, RewardOption, UserActionType, UserReward } from '../../types';
import { MILLISECONDS_PER_YEAR } from '../../utils';
import { ElendMarketQueryOperation } from '../query/query';
import { ElendMarketObligationCalculationOperation } from './obligation-calculation';
import { ElendMarketReserveCalculationOperation } from './reserve-calculation';

export class ElendMarketRewardCalculationOperation implements IElendMarketRewardCalculationOperation {
  private readonly queryOperation: ElendMarketQueryOperation;
  constructor(queryOperation: ElendMarketQueryOperation) {
    this.queryOperation = queryOperation;
  }

  async getTotalIncentiveRewardStatisticObligation(
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveMarketType: Map<string, string>,
    reserveTokenPrice: Map<string, DecimalJs>,
    reserves?: string[]
  ): Promise<DetailIncentiveRewardRes[]> {
    const results = await Promise.all(
      Array.from(associateReserves.entries())
        .filter(([reserveAddress]) => {
          if (!reserves) return true;
          return reserves.some(r => r === reserveAddress);
        })
        .map(async ([reserveAddress, reserve]) => {
          const marketType = reserveMarketType.get(reserveAddress);
          if (!marketType) {
            throw new Error(`Market type not found for reserve address: ${reserveAddress}`);
          }

          // Deposit reward
          const incentiveRewardRes = [];
          const rewardConfigDeposits = await this.queryOperation.fetchRewardConfigs(reserveAddress, marketType, RewardOption.Deposit);
          for (const rewardConfigDeposit of rewardConfigDeposits) {
            const userRewardDeposit = await this.queryOperation.fetchUserReward(
              reserveAddress,
              rewardConfigDeposit.rewardTokenType,
              RewardOption.Deposit,
              obligation.id,
              obligation.owner
            );
            const pendingRewardDeposit = userRewardDeposit
              ? this.estimatePendingReward(reserve, obligation, associateReserves, reserveTokenPrice, rewardConfigDeposit, userRewardDeposit)
              : new DecimalJs(0);

            incentiveRewardRes.push({
              reserve: reserve.id,
              //TODO: update later
              rewardTokenInfo: {
                symbol: 'EUSD',
                tokenType: rewardConfigDeposit.rewardTokenType,
                decimals: 9,
              },
              option: RewardOption.Deposit,
              earnedReward: userRewardDeposit ? userRewardDeposit.earnedAmount.toDecimalJs() : new DecimalJs(0),
              pendingReward: pendingRewardDeposit,
              claimedReward: userRewardDeposit ? userRewardDeposit.claimedAmount.toDecimalJs() : new DecimalJs(0),
            });
          }

          // Borrow reward
          const rewardConfigBorrows = await this.queryOperation.fetchRewardConfigs(reserveAddress, marketType, RewardOption.Borrow);
          for (const rewardConfigBorrow of rewardConfigBorrows) {
            const userRewardBorrow = await this.queryOperation.fetchUserReward(
              reserveAddress,
              rewardConfigBorrow.rewardTokenType,
              RewardOption.Deposit,
              obligation.id,
              obligation.owner
            );
            const pendingRewardBorrow = userRewardBorrow
              ? this.estimatePendingReward(reserve, obligation, associateReserves, reserveTokenPrice, rewardConfigBorrow, userRewardBorrow)
              : new DecimalJs(0);

            incentiveRewardRes.push({
              reserve: reserve.id,
              //TODO: update later
              rewardTokenInfo: {
                symbol: 'EUSD',
                tokenType: rewardConfigBorrow.rewardTokenType,
                decimals: 9,
              },
              option: RewardOption.Deposit,
              earnedReward: userRewardBorrow ? userRewardBorrow.earnedAmount.toDecimalJs() : new DecimalJs(0),
              pendingReward: pendingRewardBorrow,
              claimedReward: userRewardBorrow ? userRewardBorrow.claimedAmount.toDecimalJs() : new DecimalJs(0),
            });
          }
          return incentiveRewardRes;
        })
    );

    return results.flat();
  }

  async calculateIncentiveRewardApyInterest(reserve: Reserve, marketType: string, option: number): Promise<Map<string, DecimalJs>> {
    const rewardConfigs = await this.queryOperation.fetchRewardConfigs(reserve.id, marketType, option);
    const result = new Map<string, DecimalJs>();
    const reserveCalculation = new ElendMarketReserveCalculationOperation(this.queryOperation);
    for (const rewardConfig of rewardConfigs) {
      const totalDuration = Number(rewardConfig.endAt - rewardConfig.startedAt);
      const currentTimestamp = new Date().getTime();
      const remainingTimestamp = Math.max(0, Number(rewardConfig.endAt) - currentTimestamp);
      if (remainingTimestamp <= 0 || BigInt(currentTimestamp) < rewardConfig.startedAt) {
        result.set(rewardConfig.rewardTokenType, new DecimalJs(0));
        continue;
      }

      let totalEffective: DecimalJs = new DecimalJs(0);
      switch (rewardConfig.option) {
        case RewardOption.Deposit: // Supply - withdraw
          totalEffective = reserveCalculation.getTotalSupply(reserve);
          break;
        case RewardOption.Borrow: //Borrow - repay
          totalEffective = reserveCalculation.getBorrowedAmount(reserve);
          break;
      }

      const marketPrice = reserveCalculation.getReserveMarketPrice(reserve);
      const totalEffectiveValue = totalEffective.div(new DecimalJs(Math.pow(10, reserve.liquidity.mintDecimal))).mul(marketPrice);

      const remainingRewardFunds = new DecimalJs(rewardConfig.totalFunds).div(new DecimalJs(totalDuration)).mul(new DecimalJs(remainingTimestamp));
      const remainingRewardFundsValue = remainingRewardFunds.div(Math.pow(10, 9));

      result.set(rewardConfig.rewardTokenType, remainingRewardFundsValue.div(totalEffectiveValue).div(remainingTimestamp).mul(MILLISECONDS_PER_YEAR));
    }

    return result;
  }

  async estimateIncentiveRewardNewApyInterest(
    reserve: Reserve,
    marketType: string,
    option: number,
    amount: number,
    userAction: UserActionType
  ): Promise<Map<string, DecimalJs>> {
    const rewardConfigs = await this.queryOperation.fetchRewardConfigs(reserve.id, marketType, option);
    const result = new Map<string, DecimalJs>();
    const reserveCalculation = new ElendMarketReserveCalculationOperation(this.queryOperation);
    for (const rewardConfig of rewardConfigs) {
      const totalDuration = rewardConfig.endAt - rewardConfig.startedAt;
      const currentTimestamp = new Date().getTime();
      const remainingTimestamp = Math.max(0, Number(rewardConfig.endAt) - currentTimestamp);

      if (remainingTimestamp <= 0) {
        result.set(rewardConfig.rewardTokenType, new DecimalJs(0));
        continue;
      }

      let totalEffective: DecimalJs = new DecimalJs(0);
      switch (userAction) {
        case UserActionType.Deposit:
          totalEffective = reserveCalculation.getTotalSupply(reserve).add(new DecimalJs(amount));
          break;
        case UserActionType.Borrow:
          totalEffective = reserveCalculation.getBorrowedAmount(reserve).add(new DecimalJs(amount));
          break;
        case UserActionType.Withdraw:
          totalEffective = reserveCalculation.getTotalSupply(reserve).sub(new DecimalJs(amount));
          break;
        case UserActionType.Repay:
          totalEffective = reserveCalculation.getBorrowedAmount(reserve).sub(new DecimalJs(amount));
          break;
      }

      const marketPrice = reserveCalculation.getReserveMarketPrice(reserve);
      const totalEffectiveValue = totalEffective.div(new DecimalJs(Math.pow(10, reserve.liquidity.mintDecimal))).mul(marketPrice);

      const remainingRewardFunds = new DecimalJs(rewardConfig.totalFunds.toString())
        .div(new DecimalJs(totalDuration.toString()))
        .mul(new DecimalJs(remainingTimestamp.toString()));
      const remainingRewardFundsValue = remainingRewardFunds.div(Math.pow(10, 9));

      result.set(rewardConfig.rewardTokenType, remainingRewardFundsValue.div(totalEffectiveValue).div(remainingTimestamp).mul(MILLISECONDS_PER_YEAR));
    }

    return result;
  }

  private estimatePendingReward(
    reserve: Reserve,
    obligation: Obligation,
    associateReserves: Map<string, Reserve>,
    reserveTokenPrice: Map<string, DecimalJs>,
    rewardConfig: RewardConfig,
    userReward: UserReward
  ) {
    let totalEffective: DecimalJs = new DecimalJs(0);
    let userEffective: DecimalJs = new DecimalJs(0);
    const currentTimestamp = new Date().getTime();
    const elapsedTime = Math.max(0, Math.min(currentTimestamp, Number(rewardConfig.endAt)) - Number(rewardConfig.lastUpdatedAt));

    const reserveCalculation = new ElendMarketReserveCalculationOperation(this.queryOperation);
    const obligationCalculation = new ElendMarketObligationCalculationOperation(this.queryOperation);
    switch (rewardConfig.option) {
      case RewardOption.Deposit: //supply
        totalEffective = reserveCalculation.getTotalSupply(reserve);
        userEffective =
          obligationCalculation.getDetailSuppliedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, [reserve])[0]?.suppliedAmount ||
          new DecimalJs(0);
        break;
      case RewardOption.Borrow: //borrow
        totalEffective = reserveCalculation.getBorrowedAmount(reserve);
        userEffective =
          obligationCalculation.getDetailBorrowedOnMarketObligation(obligation, associateReserves, reserveTokenPrice, [reserve])[0]?.borrowedAmount ||
          new DecimalJs(0);
        break;
    }

    const rewardDistributeRate = new DecimalJs(rewardConfig.totalFunds / (rewardConfig.endAt - rewardConfig.startedAt));
    const globalRewardIndex = rewardDistributeRate.mul(new DecimalJs(elapsedTime)).div(totalEffective);

    const newGlobalRewardIndex = globalRewardIndex.add(rewardConfig.lastGlobalRewardIndex.toDecimalJs());

    const earnedAmount = newGlobalRewardIndex.sub(userReward.userRewardIndex.toDecimalJs()).mul(userEffective);

    return userReward.earnedAmount.toDecimalJs().add(earnedAmount).sub(userReward.claimedAmount.toDecimalJs());
  }
}
