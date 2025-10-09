"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendMarketRewardOperation = void 0;
const lodash_1 = require("lodash");
const transactions_1 = require("@mysten/sui/transactions");
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const constant_1 = require("../../common/constant");
const core_1 = require("../../core");
const utils_1 = require("../../utils");
const common_1 = require("../lending/common");
const query_1 = require("../query/query");
class ElendMarketRewardOperation {
    constructor(networkConfig, suiClient) {
        this.contract = new core_1.ElendMarketContract(networkConfig);
        this.query = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.networkConfig = networkConfig;
        this.pythClient = new pyth_sui_js_1.SuiPythClient(suiClient, networkConfig.packages[networkConfig.latestVersion].pythState, networkConfig.packages[networkConfig.latestVersion].wormholeState);
        this.suiClient = suiClient;
    }
    async buildClaimRewardTxn(args) {
        const { owner, reserve, marketType, option } = args;
        const tx = new transactions_1.Transaction();
        const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
        const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
        if ((0, lodash_1.isNil)(obligationOwnerCap)) {
            throw new Error('Must Init Obligation First');
        }
        const obligationId = obligationOwnerCap.obligation;
        const obligationData = await this.query.fetchObligation(obligationId);
        if ((0, lodash_1.isNil)(obligationData))
            throw Error('Not found obligation to deposit');
        // - Refresh reserves
        const reserves = packageInfo.reserves;
        await (0, common_1.refreshReserves)(tx, {
            obligationData,
            reserve,
            pythClient: this.pythClient,
            networkConfig: this.networkConfig,
            contract: this.contract,
        });
        // - Refresh obligation
        this.contract.refreshObligation(tx, [marketType, Object.keys(reserves)[0], Object.keys(reserves)[1], Object.keys(reserves)[2]], {
            version: packageInfo.version.id,
            obligation: obligationId,
            reserveT1: reserves[Object.keys(reserves)[0]].id,
            reserveT2: reserves[Object.keys(reserves)[1]].id,
            reserveT3: reserves[Object.keys(reserves)[2]].id,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        const tokenType = (0, utils_1.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        this.contract.updateRewardConfig(tx, [marketType, tokenType], {
            version: packageInfo.version.id,
            reserve,
            option: option,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        this.contract.updateUserReward(tx, [marketType, tokenType], {
            version: packageInfo.version.id,
            obligation: obligationId,
            reserve,
            option: option,
        });
        const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, option);
        for (const rewardConfig of rewardConfigs) {
            this.contract.claimReward(tx, [marketType, (0, utils_1.add0xPrefix)(rewardConfig.rewardTokenType)], {
                version: packageInfo.version.id,
                tokenRewardState: packageInfo.tokenRewardState.id,
                obligation: obligationId,
                reserve,
                option,
            });
        }
        return tx;
    }
}
exports.ElendMarketRewardOperation = ElendMarketRewardOperation;
//# sourceMappingURL=reward.js.map