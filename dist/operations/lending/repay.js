"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepayElendMarketOperation = void 0;
const lodash_1 = require("lodash");
const transactions_1 = require("@mysten/sui/transactions");
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const constant_1 = require("../../common/constant");
const core_1 = require("../../core");
const common_1 = require("../../types/common");
const utils_1 = require("../../utils");
const query_1 = require("../query/query");
const common_2 = require("./common");
class RepayElendMarketOperation {
    constructor(networkConfig, suiClient) {
        this.ABSILON = 0.3;
        this.contract = new core_1.ElendMarketContract(networkConfig);
        this.query = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.networkConfig = networkConfig;
        this.pythClient = new pyth_sui_js_1.SuiPythClient(suiClient, networkConfig.packages[networkConfig.latestVersion].pythState, networkConfig.packages[networkConfig.latestVersion].wormholeState);
        this.suiClient = suiClient;
    }
    async buildRepayTxn(args) {
        const { owner, reserve, amount, decimals, marketType } = args;
        const tx = new transactions_1.Transaction();
        const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
        if ((0, lodash_1.isNil)(obligationOwnerCap)) {
            throw new Error('Must Init Obligation First');
        }
        const obligationId = obligationOwnerCap.obligation;
        const obligationData = await this.query.fetchObligation(obligationId);
        if ((0, lodash_1.isNil)(obligationData))
            throw Error('Not found obligation to repay');
        const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
        const reserves = packageInfo.reserves;
        await (0, common_2.refreshReserves)(tx, {
            obligationData,
            reserve,
            pythClient: this.pythClient,
            networkConfig: this.networkConfig,
            contract: this.contract,
        });
        this.contract.refreshObligation(tx, [marketType, Object.keys(reserves)[0], Object.keys(reserves)[1], Object.keys(reserves)[2], Object.keys(reserves)[3]], {
            version: packageInfo.version.id,
            obligation: obligationId,
            reserveT1: reserves[Object.keys(reserves)[0]].id,
            reserveT2: reserves[Object.keys(reserves)[1]].id,
            reserveT3: reserves[Object.keys(reserves)[2]].id,
            reserveT4: reserves[Object.keys(reserves)[3]].id,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        const rewardConfigs = await this.query.fetchRewardConfigs(reserve, marketType, common_1.RewardOption.Borrow);
        for (const rewardConfig of rewardConfigs) {
            const rewardTokenType = rewardConfig.rewardTokenType;
            const userReward = await this.query.fetchUserReward(reserve, rewardTokenType, common_1.RewardOption.Borrow, obligationId, owner);
            if (!userReward) {
                this.contract.initUserReward(tx, [marketType, rewardTokenType], {
                    version: packageInfo.version.id,
                    obligation: obligationId,
                    reserve,
                    option: common_1.RewardOption.Borrow,
                    phase: rewardConfig.phase,
                });
            }
        }
        const tokenType = (0, utils_1.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        if (rewardConfigs.length > 0) {
            this.contract.updateRewardConfig(tx, [marketType, tokenType], {
                version: packageInfo.version.id,
                reserve,
                option: common_1.RewardOption.Borrow,
                clock: constant_1.SUI_SYSTEM_CLOCK,
            });
            this.contract.updateUserReward(tx, [marketType, tokenType], {
                version: packageInfo.version.id,
                obligation: obligationId,
                reserve,
                option: common_1.RewardOption.Borrow,
            });
        }
        await this.handleRepayOperation(tx, {
            owner,
            reserve,
            amount,
            decimals,
            obligationOwnerCap: obligationOwnerCap.id,
            obligationId,
            packageInfo,
        });
        return tx;
    }
    async handleRepayOperation(tx, args) {
        const { owner, reserve, decimals, obligationOwnerCap, obligationId, packageInfo } = args;
        let { amount } = args;
        const tokenType = (0, utils_1.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        const totalAmount = await this.suiClient.getBalance({
            owner,
            coinType: tokenType,
        });
        console.log('🚀 ~ RepayElendMarketOperation ~ handleRepayOperation ~ totalAmount:', totalAmount);
        let repayCoin;
        if (amount == utils_1.U64_MAX) {
            if (tokenType == utils_1.SUI_COIN_TYPE) {
                repayCoin = tx.splitCoins(tx.gas, [Number(totalAmount.totalBalance) - utils_1.GAS_BUDGET]);
            }
            else {
                repayCoin = await (0, utils_1.splitCoin)(this.suiClient, tx, owner, tokenType, [Number(totalAmount.totalBalance)]);
            }
        }
        else {
            if (tokenType == utils_1.SUI_COIN_TYPE) {
                repayCoin = tx.splitCoins(tx.gas, [Number(amount) + this.ABSILON * Math.pow(10, decimals)]);
            }
            else {
                repayCoin = await (0, utils_1.splitCoin)(this.suiClient, tx, owner, tokenType, [Number(amount) + this.ABSILON * Math.pow(10, decimals)]);
            }
        }
        this.contract.repayObligationLiquidity(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
            version: packageInfo.version.id,
            reserve: reserve,
            obligation: obligationId,
            obligationOwnerCap: obligationOwnerCap,
            repayCoin,
            repayAmount: BigInt(amount),
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        tx.transferObjects([repayCoin], owner);
    }
}
exports.RepayElendMarketOperation = RepayElendMarketOperation;
//# sourceMappingURL=repay.js.map