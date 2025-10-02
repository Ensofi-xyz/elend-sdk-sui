"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const networks_json_1 = __importDefault(require("../../config/networks.json"));
const v1_0_0_json_1 = __importDefault(require("../../config/versions/mainnet/v1.0.0.json"));
const v1_0_2_json_1 = __importDefault(require("../../config/versions/testnet/v1.0.2.json"));
const common_1 = require("../types/common");
class ConfigLoader {
    static loadNetworkConfig(network) {
        let networkConfig = networks_json_1.default[network];
        let packageConfigData = network == common_1.Network.Mainnet ? v1_0_0_json_1.default : v1_0_2_json_1.default;
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
        };
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=config-loader.js.map