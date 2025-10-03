import networkConfigs from '../../config/networks.json';
import mainnetConfig from '../../config/versions/mainnet/v1.0.0.json';
import testnetConfig from '../../config/versions/testnet/v1.0.3.json';
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
    let packageConfigData = network == Network.Mainnet ? mainnetConfig : testnetConfig;
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
