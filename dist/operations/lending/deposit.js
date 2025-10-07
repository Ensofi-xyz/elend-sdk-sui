"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositElendMarketOperation = void 0;
const lodash_1 = require("lodash");
const transactions_1 = require("@mysten/sui/transactions");
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const constant_1 = require("../../common/constant");
const core_1 = require("../../core");
const common_1 = require("../../types/common");
const common_2 = require("../../utils/common");
const split_coin_1 = require("../../utils/split-coin");
const query_1 = require("../query/query");
const common_3 = require("./common");
class DepositElendMarketOperation {
    constructor(networkConfig, suiClient) {
        this.contract = new core_1.ElendMarketContract(networkConfig);
        this.query = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.networkConfig = networkConfig;
        this.pythClient = new pyth_sui_js_1.SuiPythClient(suiClient, networkConfig.packages[networkConfig.latestVersion].pythState, networkConfig.packages[networkConfig.latestVersion].wormholeState);
        this.suiClient = suiClient;
    }
    async buildInitObligationTxn(args) {
        const { owner, marketType } = args;
        const tx = new transactions_1.Transaction();
        const obligationOwnerCap = await this.query.fetchObligationOwnerCapObject(owner, marketType);
        if (!(0, lodash_1.isNil)(obligationOwnerCap))
            throw new Error('Obligation Already Init');
        const packageInfo = this.networkConfig.packages[this.networkConfig.latestVersion];
        const market = packageInfo.lendingMarkets[marketType];
        const obligationOwnerCapResult = this.contract.initObligation(tx, packageInfo.marketType['MAIN_POOL'], {
            version: packageInfo.version.id,
            market: market.id,
            owner,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        tx.transferObjects([obligationOwnerCapResult], owner);
        return tx;
    }
    async buildDepositTxn(args) {
        const { amount, owner, reserve, marketType } = args;
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
        const priceFeedObjectReserveDeposit = await (0, common_3.refreshReserves)(tx, {
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
        // - Handle deposit operation
        await this.handleDepositOperation(tx, {
            owner,
            reserve,
            amount,
            obligationOwnerCap: obligationOwnerCap.id,
            obligationId,
            packageInfo,
            priceFeedObjectReserveDeposit,
        });
        return tx;
    }
    async handleDepositOperation(tx, args) {
        const { owner, reserve, amount, obligationOwnerCap, obligationId, packageInfo, priceFeedObjectReserveDeposit } = args;
        const tokenType = (0, common_2.getTokenTypeForReserve)(reserve, packageInfo);
        if (!tokenType) {
            throw new Error(`Token type not found for reserve: ${reserve}`);
        }
        let depositCoin;
        if (tokenType == common_2.SUI_COIN_TYPE) {
            const totalAmount = await this.suiClient.getBalance({
                owner,
                coinType: tokenType,
            });
            depositCoin =
                (await Number(totalAmount.totalBalance)) - amount < common_2.GAS_BUDGET
                    ? tx.splitCoins(tx.gas, [Number(totalAmount.totalBalance) - common_2.GAS_BUDGET])
                    : tx.splitCoins(tx.gas, [amount]);
        }
        else {
            depositCoin = await (0, split_coin_1.splitCoin)(this.suiClient, tx, owner, tokenType, [amount]);
        }
        const cToken = this.contract.depositReserveLiquidityAndMintCTokens(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
            version: packageInfo.version.id,
            reserve: reserve,
            coin: depositCoin,
            priceInfoObject: priceFeedObjectReserveDeposit,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
        this.contract.depositCTokensIntoObligation(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
            obligationOwnerCap: obligationOwnerCap,
            version: packageInfo.version.id,
            reserve: reserve,
            obligation: obligationId,
            cToken: cToken,
            clock: constant_1.SUI_SYSTEM_CLOCK,
        });
    }
}
exports.DepositElendMarketOperation = DepositElendMarketOperation;
//# sourceMappingURL=deposit.js.map