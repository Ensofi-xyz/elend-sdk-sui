"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawElendMarketOperation = void 0;
const lodash_1 = require("lodash");
const transactions_1 = require("@mysten/sui/transactions");
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const constant_1 = require("../../common/constant");
const core_1 = require("../../core");
const common_1 = require("../../types/common");
const common_2 = require("../../utils/common");
const query_1 = require("../query/query");
const common_3 = require("./common");
class WithdrawElendMarketOperation {
    constructor(networkConfig, suiClient) {
        this.contract = new core_1.ElendMarketContract(networkConfig);
        this.query = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.networkConfig = networkConfig;
        this.pythClient = new pyth_sui_js_1.SuiPythClient(suiClient, networkConfig.packages[networkConfig.latestVersion].pythState, networkConfig.packages[networkConfig.latestVersion].wormholeState);
        this.suiClient = suiClient;
    }
    async buildWithdrawTxn(args) {
        const { owner, reserve, collateralAmount, marketType } = args;
        const tx = new transactions_1.Transaction();
        const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
        if ((0, lodash_1.isNil)(obligationOwnerCap))
            throw new Error('Obligation Not Init');
        const obligationId = obligationOwnerCap.obligation;
        const obligationData = await this.query.fetchObligation(obligationId);
        if ((0, lodash_1.isNil)(obligationData))
            throw Error('Not found obligation to withdraw');
        const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
        // - Refresh reserves
        const reserves = packageInfo.reserves;
        await (0, common_3.refreshReserves)(tx, {
            obligationData,
            reserve,
            pythClient: this.pythClient,
            networkConfig: this.networkConfig,
            contract: this.contract,
        });
        // - Refresh obligation
        this.contract.refreshObligation(tx, [packageInfo.marketType['MAIN_POOL'], Object.keys(reserves)[0], Object.keys(reserves)[1], Object.keys(reserves)[2]], {
            version: packageInfo.version.id,
            obligation: obligationId,
            reserveT1: reserves[Object.keys(reserves)[0]].id,
            reserveT2: reserves[Object.keys(reserves)[1]].id,
            reserveT3: reserves[Object.keys(reserves)[2]].id,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, common_1.RewardOption.Deposit);
        for (const rewardConfig of rewardConfigs) {
            const rewardTokenType = rewardConfig.rewardTokenType;
            const userReward = await this.query.fetchUserReward(reserve, rewardTokenType, common_1.RewardOption.Deposit, obligationId, owner);
            if (!userReward) {
                this.contract.initUserReward(tx, [marketType, rewardTokenType], {
                    version: packageInfo.version.id,
                    obligation: obligationId,
                    reserve,
                    option: common_1.RewardOption.Deposit,
                    phase: rewardConfig.phase,
                });
            }
        }
        const tokenType = (0, common_2.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        if (rewardConfigs.length > 0) {
            this.contract.updateRewardConfig(tx, [marketType, tokenType], {
                version: packageInfo.version.id,
                reserve,
                option: common_1.RewardOption.Deposit,
                clock: constant_1.SUI_SYSTEM_CLOCK,
            });
            this.contract.updateUserReward(tx, [marketType, tokenType], {
                version: packageInfo.version.id,
                obligation: obligationId,
                reserve,
                option: common_1.RewardOption.Deposit,
            });
        }
        // - handle withdraw operation
        await this.handleWithdrawOperation(tx, {
            collateralAmount,
            obligationId,
            obligationOwnerCap: obligationOwnerCap.id,
            owner,
            packageInfo,
            reserve,
        });
        return tx;
    }
    async handleWithdrawOperation(tx, args) {
        const { owner, reserve, collateralAmount, obligationOwnerCap, obligationId, packageInfo } = args;
        const tokenType = (0, common_2.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        const coin = this.contract.withdrawCTokensAndRedeemLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
            version: packageInfo.version.id,
            reserve: reserve,
            obligation: obligationId,
            obligationOwnerCap: obligationOwnerCap,
            collateralAmount: BigInt(collateralAmount),
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        tx.transferObjects([coin], owner);
    }
}
exports.WithdrawElendMarketOperation = WithdrawElendMarketOperation;
//# sourceMappingURL=withdraw.js.map