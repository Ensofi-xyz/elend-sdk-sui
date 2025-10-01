"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendClient = void 0;
const lodash_1 = require("lodash");
const config_loader_1 = require("./core/config-loader");
const obligation_calculation_1 = require("./operations/calculation/obligation-calculation");
const reserve_calculation_1 = require("./operations/calculation/reserve-calculation");
const reward_calculation_1 = require("./operations/calculation/reward-calculation");
const borrow_1 = require("./operations/lending/borrow");
const deposit_1 = require("./operations/lending/deposit");
const repay_1 = require("./operations/lending/repay");
const withdraw_1 = require("./operations/lending/withdraw");
const query_1 = require("./operations/query/query");
const reward_1 = require("./operations/reward/reward");
const sui_client_1 = require("./utils/sui-client");
class ElendClient {
    constructor(networkConfig, suiClient) {
        this.networkConfig = networkConfig;
        this.suiClient = suiClient;
        this.markets = [];
        this.obligationOwner = null;
        this.obligations = new Map();
        this.reserves = new Map();
        this.depositOperation = new deposit_1.DepositElendMarketOperation(networkConfig, suiClient);
        this.borrowOperation = new borrow_1.BorrowElendMarketOperation(networkConfig, suiClient);
        this.withdrawOperation = new withdraw_1.WithdrawElendMarketOperation(networkConfig, suiClient);
        this.repayOperation = new repay_1.RepayElendMarketOperation(networkConfig, suiClient);
        this.rewardOperation = new reward_1.ElendMarketRewardOperation(networkConfig, suiClient);
        this.queryOperation = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.reserveCalculationOperation = new reserve_calculation_1.ElendMarketReserveCalculationOperation();
        this.obligationCalculationOperation = new obligation_calculation_1.ElendMarketObligationCalculationOperation();
        this.rewardCalculationOperation = new reward_calculation_1.ElendMarketRewardCalculationOperation();
    }
    static async create(network, options) {
        const networkConfig = config_loader_1.ConfigLoader.loadNetworkConfig(network);
        const suiClient = (0, lodash_1.isNil)(options?.suiClient) ? (0, sui_client_1.getSuiClientInstance)(networkConfig.rpcUrl, networkConfig.wsRpcUrl) : options.suiClient;
        const elendClient = new ElendClient(networkConfig, suiClient);
        if (!(0, lodash_1.isNil)(options) && options.isLoadData) {
            await elendClient.loadMarket();
            await elendClient.loadReserves();
        }
        if (!(0, lodash_1.isNil)(options?.obligationOwner)) {
            await elendClient.loadObligation(options.obligationOwner);
        }
        return elendClient;
    }
    async loadMarket() {
        const marketConfigs = this.networkConfig.packages[this.networkConfig.latestVersion].lendingMarkets;
        for (const [marketType, marketConfig] of Object.entries(marketConfigs)) {
            const market = await this.queryOperation.fetchMarket(marketConfig.id);
            if ((0, lodash_1.isNil)(market))
                continue;
            this.markets.push({
                id: market.id,
                name: market.name,
                marketType,
                reserveIds: market.reserves,
            });
        }
    }
    async loadObligation(obligationOwner) {
        this.obligationOwner = obligationOwner;
        if (this.markets.length == 0)
            await this.loadMarket();
        const marketTypes = this.markets.map(market => market.marketType);
        for (const marketType of marketTypes) {
            const obligationOwnerCap = await this.queryOperation.fetchObligationOwnerCapObject(obligationOwner, marketType);
            if ((0, lodash_1.isNil)(obligationOwnerCap))
                continue;
            const obligationId = obligationOwnerCap.obligation;
            const obligation = await this.queryOperation.fetchObligation(obligationId);
            if ((0, lodash_1.isNil)(obligation))
                continue;
            this.obligations.set(marketType, obligation);
        }
    }
    async loadReserves() {
        if (this.markets.length == 0)
            await this.loadMarket();
        for (const market of this.markets) {
            const reserves = [];
            for (const reserveId of market.reserveIds) {
                const reserve = await this.queryOperation.fetchReserve(reserveId);
                if ((0, lodash_1.isNil)(reserve))
                    continue;
                reserves.push(reserve);
            }
            this.reserves.set(market.marketType, reserves);
        }
    }
    async reloadObligation() {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Not load obligation owner yet');
        }
        this.loadObligation(this.obligationOwner);
    }
    async reloadReserves() {
        await this.loadReserves();
    }
    async getMarkets() {
        if (this.markets.length == 0) {
            const marketConfigs = this.networkConfig.packages[this.networkConfig.latestVersion].lendingMarkets;
            for (const [marketType, marketConfig] of Object.entries(marketConfigs)) {
                const market = await this.queryOperation.fetchMarket(marketConfig.id);
                if ((0, lodash_1.isNil)(market))
                    continue;
                this.markets.push({
                    id: market.id,
                    name: market.name,
                    marketType,
                    reserveIds: market.reserves,
                });
            }
        }
        return this.markets;
    }
    getReserves(marketTypeInput) {
        if (this.reserves.size == 0) {
            this.loadReserves();
        }
        const result = new Map();
        for (const [marketType, reserves] of this.reserves.entries()) {
            if (marketTypeInput && marketType != marketType)
                continue;
            const reserveRes = reserves.map(reserve => {
                return {
                    id: reserve.id,
                    marketType,
                    tokenLiquidity: {
                        symbol: reserve.config.tokenInfo.symbol,
                        decimals: reserve.liquidity.mintDecimal,
                        tokenType: reserve.liquidity.mintTokenType,
                    },
                };
            });
            result.set(marketType, reserveRes);
        }
        return result;
    }
    async initObligation(marketType) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Not load obligation owner yet');
        }
        return this.depositOperation.buildInitObligationTxn({
            owner: this.obligationOwner,
            marketType,
        });
    }
    async deposit(reserve, marketType, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        return this.depositOperation.buildDepositTxn({
            owner: this.obligationOwner,
            reserve,
            amount: liquidityAmount,
            marketType,
        });
    }
    async borrow(reserve, marketType, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        return this.borrowOperation.buildBorrowTxn({
            owner: this.obligationOwner,
            reserve,
            amount: liquidityAmount,
            marketType,
        });
    }
    async withdraw(reserve, marketType, collateralAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        return this.withdrawOperation.buildWithdrawTxn({
            owner: this.obligationOwner,
            reserve,
            collateralAmount,
            marketType,
        });
    }
    async repay(reserve, marketType, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        return this.repayOperation.buildRepayTxn({
            amount: liquidityAmount,
            owner: this.obligationOwner,
            reserve,
            marketType,
        });
    }
}
exports.ElendClient = ElendClient;
//# sourceMappingURL=elend-client.js.map