import { SuiClient } from '@mysten/sui/client';

import { NetworkConfig } from '../../interfaces/config';
import { IElendMarketQueryOperation } from '../../interfaces/operations';
import { Market, Obligation, ObligationCollateral, ObligationLiquidity, ObligationOwnerCap, Reserve, RewardConfig, UserReward } from '../../types/object';
import { Decimal, i64ToBigInt, remove0xPrefix } from '../../utils';

export class ElendMarketQueryOperation implements IElendMarketQueryOperation {
  private suiClient: SuiClient;
  private networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig, client: SuiClient) {
    this.suiClient = client;
    this.networkConfig = networkConfig;
  }

  async fetchObligationOwnerCapObject(owner: string, marketType: string): Promise<ObligationOwnerCap | null> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];

    const obligationOwnerCapStructType = `${packageInfo.package}::obligation::ObligationOwnerCap<${marketType}>`;
    const response = await this.suiClient.getOwnedObjects({
      owner: owner,
      options: {
        showContent: true,
      },
      filter: {
        StructType: obligationOwnerCapStructType,
      },
    });
    if (response.data.length > 0 && response.data[0]?.data?.content) {
      const data = (response.data[0]?.data?.content as any).fields;
      return {
        id: data.id.id,
        obligation: data.obligation,
      } as ObligationOwnerCap;
    } else {
      return null;
    }
  }

  async fetchMarket(marketId: string): Promise<Market | null> {
    const response = await this.suiClient.getObject({
      id: marketId,
      options: {
        showContent: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch reserve');
    }

    if (response.data?.content) {
      const data = (response.data?.content as any)['fields'];
      return {
        id: data.id.id,
        name: data.name,
        reserves: data.reserves,
        reserve_infos: data.reserve_infos.fields.id.id,
      } as Market;
    } else {
      return null;
    }
  }

  async fetchReserve(reserveId: string): Promise<Reserve | null> {
    const response = await this.suiClient.getObject({
      id: reserveId,
      options: {
        showContent: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch reserve');
    }

    if (response.data?.content) {
      const reserveData = (response.data?.content as any)['fields'];
      const reserveLiquidityData = reserveData.liquidity.fields;
      const reserveCollateralData = reserveData.collateral.fields;
      const reserveConfigData = reserveData.config.fields;
      const reserveLastUpdateData = reserveData.last_update.fields;
      return {
        id: reserveData.id.id,
        liquidity: {
          mintTokenType: reserveLiquidityData.mint_token_type,
          availableAmount: BigInt(reserveLiquidityData.available_amount),
          borrowedAmount: new Decimal(BigInt(reserveLiquidityData.borrowed_amount.fields.value)),
          marketPrice: new Decimal(BigInt(reserveLiquidityData.market_price.fields.value)),
          marketPriceLastUpdatedTs: reserveLiquidityData.market_price_last_updated_ts,
          mintDecimal: Number(reserveLiquidityData.mint_decimal),
          depositLimitCrossedTs: Number(reserveLiquidityData.deposit_limit_crossed_ts),
          borrowLimitCrossedTs: Number(reserveLiquidityData.borrow_limit_crossed_ts),
          cumulativeBorrowRate: new Decimal(BigInt(reserveLiquidityData.cumulative_borrow_rate.fields.value)),
          accumulatedProtocolFees: new Decimal(BigInt(reserveLiquidityData.accumulated_protocol_fees.fields.value)),
        },
        collateral: {
          mintTotalAmount: BigInt(reserveCollateralData.mint_total_amount),
        },
        config: {
          status: Number(reserveConfigData.status),
          assetTier: Number(reserveConfigData.asset_tier),
          baseFixedInterestRateBps: Number(reserveConfigData.base_fixed_interest_rate_bps),
          reserveFactorRateBps: Number(reserveConfigData.reserve_factor_rate_bps),
          maxInterestRateBps: Number(reserveConfigData.max_interest_rate_bps),
          loanToValueBps: Number(reserveConfigData.loan_to_value_bps),
          liquidationThresholdBps: Number(reserveConfigData.liquidation_threshold_bps),
          liquidationMaxDebtCloseFactorBps: Number(reserveConfigData.liquidation_max_debt_close_factor_bps),
          liquidationPenaltyBps: Number(reserveConfigData.liquidation_penalty_bps),
          borrowRateAtOptimalBps: Number(reserveConfigData.borrow_rate_at_optimal_bps),
          borrowFactorBps: Number(reserveConfigData.borrow_factor_bps),
          borrowFeeBps: Number(reserveConfigData.borrow_fee_bps),
          depositLimit: BigInt(reserveConfigData.deposit_limit),
          borrowLimit: BigInt(reserveConfigData.borrow_limit),
          tokenInfo: {
            symbol: reserveConfigData.token_info.fields.symbol,
            tokenType: reserveConfigData.token_info.fields.token_type,
            upperHeuristic: BigInt(reserveConfigData.token_info.fields.upper_heuristic),
            lowerHeuristic: BigInt(reserveConfigData.token_info.fields.lower_heuristic),
            expHeuristic: BigInt(reserveConfigData.token_info.fields.exp_heuristic),
            maxTwapDivergenceBps: BigInt(reserveConfigData.token_info.fields.max_twap_divergence_bps),
            maxAgePriceSeconds: BigInt(reserveConfigData.token_info.fields.max_age_price_seconds),
            maxAgeTwapSeconds: BigInt(reserveConfigData.token_info.fields.max_age_twap_seconds),
            pythPriceFeedId: reserveConfigData.token_info.fields.pyth_price_feed_id,
            switchboardPrice: reserveConfigData.token_info.fields.switchboard_price,
            blockPriceUsage: Number(reserveConfigData.token_info.fields.block_price_usage),
          },
          depositWithdrawalCap: {
            configCapacity: i64ToBigInt(
              reserveConfigData.deposit_withdrawal_cap.fields.config_capacity.fields.magnitude,
              reserveConfigData.deposit_withdrawal_cap.fields.config_capacity.fields.negative
            ),
            currentTotal: i64ToBigInt(
              reserveConfigData.deposit_withdrawal_cap.fields.current_total.fields.magnitude,
              reserveConfigData.deposit_withdrawal_cap.fields.current_total.fields.negative
            ),
            lastIntervalStartTimestamp: BigInt(reserveConfigData.deposit_withdrawal_cap.fields.last_interval_start_timestamp),
            configIntervalLengthSeconds: BigInt(reserveConfigData.deposit_withdrawal_cap.fields.config_interval_length_seconds),
          },
          debtWithdrawalCap: {
            configCapacity: i64ToBigInt(
              reserveConfigData.debt_withdrawal_cap.fields.config_capacity.fields.magnitude,
              reserveConfigData.debt_withdrawal_cap.fields.config_capacity.fields.negative
            ),
            currentTotal: i64ToBigInt(
              reserveConfigData.debt_withdrawal_cap.fields.current_total.fields.magnitude,
              reserveConfigData.debt_withdrawal_cap.fields.current_total.fields.negative
            ),
            lastIntervalStartTimestamp: BigInt(reserveConfigData.debt_withdrawal_cap.fields.last_interval_start_timestamp),
            configIntervalLengthSeconds: BigInt(reserveConfigData.debt_withdrawal_cap.fields.config_interval_length_seconds),
          },
          utilizationOptimalBps: Number(reserveConfigData.utilization_optimal_bps),
          utilizationLimitBlockBorrowingAboveBps: Number(reserveConfigData.utilization_limit_block_borrowing_above_bps),
          minNetValueInObligation: new Decimal(reserveConfigData.min_net_value_in_obligation.fields.value),
        },
        lastUpdate: {
          timestampMs: BigInt(reserveLastUpdateData.timestamp_ms),
          stale: reserveLastUpdateData.stale,
          priceStatus: reserveLastUpdateData.price_status,
        },
      } as Reserve;
    } else {
      return null;
    }
  }

  async fetchObligation(obligationId: string): Promise<Obligation | null> {
    const response = await this.suiClient.getObject({
      id: obligationId,
      options: {
        showContent: true,
      },
    });

    if (response.error) {
      console.log('error', response.error);
      throw new Error('Failed to fetch obligation');
    }

    if (response.data?.content) {
      const data = (response.data?.content as any)['fields'];
      return {
        id: data.id.id,
        owner: data.owner,
        deposits: data.deposits,
        borrows: data.borrows,
        lowestReserveDepositLiquidationLtv: Number(data.lowest_reserve_deposit_liquidation_ltv),
        totalDepositedValue: new Decimal(data.total_deposited_value.fields.value),
        borrowFactorAdjustedDebtValue: new Decimal(data.borrow_factor_adjusted_debt_value.fields.value),
        highestBorrowFactorBps: Number(data.highest_borrow_factor_bps),
        allowedBorrowValue: new Decimal(data.allowed_borrow_value.fields.value),
        unhealthyBorrowValue: new Decimal(data.unhealthy_borrow_value.fields.value),
        depositsTokenType: data.deposits_token_type.fields.id.id,
        borrowsTokenType: data.borrows_token_type.fields.id.id,
        depositsTier: data.deposits_tier.fields.id.id,
        borrowsTier: data.borrows_tier.fields.id.id,
        numOfObsoleteReserves: data.num_of_obsolete_reserves,
        hasDebt: data.has_debt,
        lastUpdate: {
          timestampMs: BigInt(data.last_update.fields.timestamp_ms),
          stale: data.last_update.fields.stale,
          priceStatus: data.last_update.fields.price_status,
        },
        locking: data.locking,
        liquidatingAssetReserve: data.liquidating_asset_reserve,
        obligationCollateral: new Map<string, ObligationCollateral>(),
        obligationLiquidity: new Map<string, ObligationLiquidity>(),
      } as Obligation;
    } else {
      return null;
    }
  }

  async fetchRewardConfigs(reserveId: string, marketType: string, option: number, rewardTokenType?: string): Promise<RewardConfig[]> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
    const rewardConfigDfs = await this.suiClient.getDynamicFields({
      parentId: reserveId,
    });

    const result = [];
    for (const rewardConfigDf of rewardConfigDfs.data) {
      if (
        rewardConfigDf.objectType == `vector<${packageInfo.package}::reward_config::RewardConfig<${marketType}>>` &&
        (rewardConfigDf.name.value as any).option == option
      ) {
        const rewardConfigRes = await this.suiClient.getObject({
          id: rewardConfigDf.objectId,
          options: {
            showContent: true,
          },
        });

        if (rewardConfigRes.error) {
          console.log('error', rewardConfigRes.error);
          throw new Error('Failed to fetch reward config');
        }

        if (rewardConfigRes.data?.content) {
          const data = (rewardConfigRes.data?.content as any).fields.value;
          for (const rewardConfig of data) {
            result.push({
              reserve: rewardConfig.fields.reserve,
              rewardTokenType: rewardConfig.fields.reward_token_type,
              option: rewardConfig.fields.option,
              totalFunds: rewardConfig.fields.totalFunds,
              totalDistributed: new Decimal(rewardConfig.fields.total_distributed.fields.value),
              startedAt: BigInt(rewardConfig.fields.started_at),
              endAt: BigInt(rewardConfig.fields.end_at),
              initialGlobalRewardIndex: new Decimal(rewardConfig.fields.initial_global_reward_index.fields.value),
              lastGlobalRewardIndex: new Decimal(rewardConfig.fields.last_global_reward_index.fields.value),
              lastUpdatedAt: BigInt(rewardConfig.fields.last_updated_at),
            });
          }
        }
      }
    }

    return result;
  }

  async fetchUserReward(reserveId: string, rewardTokenType: string, option: number, obligationId: string, owner: string): Promise<UserReward | null> {
    const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
    const userRewardKey = {
      owner,
      reserve: reserveId,
      token_type: remove0xPrefix(rewardTokenType),
      option,
    };

    const userRewardRes = await this.suiClient.getDynamicFieldObject({
      parentId: obligationId,
      name: {
        type: `${packageInfo.package}::user_reward::UserRewardKey`,
        value: userRewardKey,
      },
    });

    if (userRewardRes.error) {
      console.log('error', userRewardRes.error);
      throw new Error('Failed to fetch user reward');
    }

    if (userRewardRes.data?.content) {
      const data = (userRewardRes.data?.content as any).fields;
      return {
        id: data.id.id,
        owner: data.owner,
        reserve: data.reserve,
        option: data.option,
        tokenType: data.tokenType,
        userRewardIndex: new Decimal(data.user_reward_index.fields.value),
        earnedAmount: new Decimal(data.earned_amount.fields.value),
        claimedAmount: new Decimal(data.claimed_amount.fields.value),
      } as UserReward;
    } else {
      return null;
    }
  }
}
