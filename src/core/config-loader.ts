import * as fs from 'fs';

import networkConfigs from '../../config/networks.json';
import { ElendMarketConfig, NetworkConfig } from '../interfaces/config';
import { Network } from '../types/common';

interface INetworkConfigJsonData {
  network: string;
  rpcUrl: string;
  wsRpcUrl: string;
  pythHermesUrl: string;
  packagesPath: Record<string, string>;
  latestVersion: string;
}

export class ConfigLoader {
  static loadNetworkConfig(network: Network): NetworkConfig {
    let networkConfig = networkConfigs[network] as INetworkConfigJsonData;
    let packageConfigPath = networkConfig.packagesPath[networkConfig.latestVersion];
    let packageConfigRaw = fs.readFileSync(packageConfigPath, 'utf-8');
    let packageConfigData = JSON.parse(packageConfigRaw) as ElendMarketConfig;

    return {
      rpcUrl: networkConfig.rpcUrl,
      wsRpcUrl: networkConfig.wsRpcUrl,
      pythHermesUrl: networkConfig.pythHermesUrl,
      packages: {
        [networkConfig.latestVersion]: packageConfigData,
      },
      latestVersion: networkConfig.latestVersion,
    } as NetworkConfig;
  }
}
