interface ConfigObject {
  id: string;
  package: string;
  type: string;
}

export interface ElendMarketConfig {
  package: string;
  marketType: Record<string, string>;
  rewardTokenType: Record<string, string>;
  marketRegistry: ConfigObject;
  lendingMarkets: Record<string, ConfigObject>;
  version: ConfigObject;
  reserves: Record<string, ConfigObject>;
  tokenRewardState: ConfigObject;
}

export interface NetworkConfig {
  rpcUrl: string;
  packages: {
    [version: string]: ElendMarketConfig;
  };
  latestVersion: string;
}
