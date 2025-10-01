"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketRewardOperation = void 0;
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const core_1 = require("../../core");
const query_1 = require("../query/query");
class ElendMarketRewardOperation {
    constructor(networkConfig, suiClient) {
        this.contract = new core_1.ElendMarketContract(networkConfig);
        this.query = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.networkConfig = networkConfig;
        this.pythClient = new pyth_sui_js_1.SuiPythClient(suiClient, networkConfig.packages[networkConfig.latestVersion].pythState, networkConfig.packages[networkConfig.latestVersion].wormholeState);
        this.suiClient = suiClient;
    }
    buildClaimRewardTxn(args) {
        throw new Error('Method not implemented.');
    }
}
exports.ElendMarketRewardOperation = ElendMarketRewardOperation;
//# sourceMappingURL=reward.js.map