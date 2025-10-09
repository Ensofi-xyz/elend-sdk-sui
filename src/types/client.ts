import { Decimal as DecimalJs } from 'decimal.js';

import { RewardOption } from './common';

export interface MarketClientRes {
  id: string;
  name: string;
  marketType: string;
  reserveIds: string[];
}

export interface TokenInfoRes {
  symbol: string;
  decimals: number;
  tokenType: string;
}

export interface ReserveClientRes {
  id: string;
  marketType: string;
  tokenLiquidity: TokenInfoRes;
}

export interface DetailSuppliedRes {
  reserve: string;
  tokenLiquidity: TokenInfoRes | null;
  suppliedAmount: DecimalJs;
  suppliedValue: DecimalJs;
}

export interface DetailBorrowedRes {
  reserve: string;
  tokenLiquidity: TokenInfoRes | null;
  borrowedAmount: DecimalJs;
  borrowedValue: DecimalJs;
}

export interface DetailSupplyApyRes {
  totalApy: DecimalJs;
  breakdownApy: {
    supplyApy: DecimalJs;
    rewardIncentiveApy: Map<string, DecimalJs>;
    lstInterest: number;
  };
}

export interface DetailBorrowApyRes {
  totalApy: DecimalJs;
  breakdownApy: {
    borrowApy: DecimalJs;
    rewardIncentiveApy: Map<string, DecimalJs>;
  };
}

export interface DetailIncentiveRewardRes {
  reserve: string;
  rewardTokenInfo: TokenInfoRes;
  option: RewardOption;
  earnedReward: DecimalJs;
  pendingReward: DecimalJs;
  claimedReward: DecimalJs;
}
