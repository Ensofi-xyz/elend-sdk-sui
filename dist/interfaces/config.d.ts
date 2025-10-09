interface ConfigObject {
    id: string;
    package: string;
    type: string;
}
export interface ElendMarketConfig {
    package: string;
    upgradedPackage: string;
    pythState: string;
    wormholeState: string;
    pythPriceFeedId: Record<string, string>;
    tokenType: Record<string, string>;
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
    wsRpcUrl: string;
    pythHermesUrl: string;
    packages: {
        [version: string]: ElendMarketConfig;
    };
    latestVersion: string;
}
export {};
