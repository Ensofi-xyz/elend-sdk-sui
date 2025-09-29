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
