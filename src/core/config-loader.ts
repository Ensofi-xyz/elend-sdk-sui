import * as fs from 'fs';
import * as path from 'path';

import networkConfigs from '../../config/networks.json';
import { NetworkConfig } from '../interfaces/config';
import { Network } from '../types/common';

interface INetworkConfigJsonData {
  network: string;
  rpcUrl: string;
  wsRpcUrl: string;
  pythHermesUrl: string;
  latestVersion: string;
}

export class ConfigLoader {
  static loadNetworkConfig(network: Network): NetworkConfig {
    let networkConfig = networkConfigs[network] as INetworkConfigJsonData;
    let packageConfigPath = path.resolve(process.cwd(), `config/versions/${network}/${networkConfig.latestVersion}.json`);
    let packageConfigRaw = fs.readFileSync(packageConfigPath, 'utf-8');
    let packageConfigData = JSON.parse(packageConfigRaw);

    return {
      rpcUrl: networkConfig.rpcUrl,
      wsRpcUrl: networkConfig.wsRpcUrl,
      pythHermesUrl: networkConfig.pythHermesUrl,
      packages: {
        [networkConfig.latestVersion]: {
          package: packageConfigData.packageId,
          upgradedPackage: packageConfigData.upgradedPackageId,
          ...packageConfigData.objects,
        },
      },
      latestVersion: networkConfig.latestVersion,
    } as NetworkConfig;
  }
}
