"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElendClient = void 0;
const decimal_js_1 = require("decimal.js");
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
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
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
        const queryOperation = new query_1.ElendMarketQueryOperation(networkConfig, suiClient);
        this.queryOperation = queryOperation;
        this.reserveCalculationOperation = new reserve_calculation_1.ElendMarketReserveCalculationOperation(queryOperation);
        this.obligationCalculationOperation = new obligation_calculation_1.ElendMarketObligationCalculationOperation(queryOperation);
        this.rewardCalculationOperation = new reward_calculation_1.ElendMarketRewardCalculationOperation(queryOperation);
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
    async getReserves(marketTypeInput) {
        if (this.reserves.size == 0) {
            await this.loadReserves();
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
    async deposit(reserve, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        const marketType = this.getMarketTypeOfReserve(reserve);
        return this.depositOperation.buildDepositTxn({
            owner: this.obligationOwner,
            reserve,
            amount: liquidityAmount,
            marketType,
        });
    }
    async borrow(reserve, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        const marketType = this.getMarketTypeOfReserve(reserve);
        return this.borrowOperation.buildBorrowTxn({
            owner: this.obligationOwner,
            reserve,
            amount: liquidityAmount,
            marketType,
        });
    }
    async withdraw(reserve, collateralAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        const marketType = this.getMarketTypeOfReserve(reserve);
        return this.withdrawOperation.buildWithdrawTxn({
            owner: this.obligationOwner,
            reserve,
            collateralAmount,
            marketType,
        });
    }
    async repay(repayReserve, liquidityAmount) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        const marketType = this.getMarketTypeOfReserve(repayReserve);
        const reserve = this.reserves.get(marketType)?.find(reserve => reserve.id == repayReserve);
        if (!reserve)
            throw new Error('Not found repay reserve');
        return this.repayOperation.buildRepayTxn({
            amount: liquidityAmount,
            owner: this.obligationOwner,
            reserve: repayReserve,
            decimals: reserve.liquidity.mintDecimal,
            marketType,
        });
    }
    async claim_reward(reserve, option) {
        if ((0, lodash_1.isNil)(this.obligationOwner)) {
            throw Error('Have not load obligation owner yet');
        }
        const marketType = this.getMarketTypeOfReserve(reserve);
        return this.rewardOperation.buildClaimRewardTxn({
            owner: this.obligationOwner,
            reserve,
            marketType,
            option,
        });
    }
    getTotalSuppliedUSDValueOnMarket(marketType, reserveIds) {
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return (0, decimal_js_1.Decimal)(0);
        return this.reserveCalculationOperation.getTotalSuppliedUSDValueOnMarket((reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves).map(reserve => (0, cloneDeep_1.default)(reserve)));
    }
    getTotalBorrowedUSDValueOnMarket(marketType, reserveIds) {
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return (0, decimal_js_1.Decimal)(0);
        return this.reserveCalculationOperation.getTotalBorrowedUSDValueOnMarket((reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves).map(reserve => (0, cloneDeep_1.default)(reserve)));
    }
    getDetailSuppliedOnMarket(marketType, reserveIds) {
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return [];
        return this.reserveCalculationOperation.getDetailSuppliedOnMarket((reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves).map(reserve => (0, cloneDeep_1.default)(reserve)));
    }
    getDetailBorrowedOnMarket(marketType, reserveIds) {
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return [];
        return this.reserveCalculationOperation.getDetailBorrowedOnMarket((reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves).map(reserve => (0, cloneDeep_1.default)(reserve)));
    }
    async getDetailSupplyApy(reserveId) {
        const currentTimestampMs = new Date().getTime();
        const marketType = this.getMarketTypeOfReserve(reserveId);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        const reserve = reserves.find(reserve => reserve.id == reserveId);
        if (!reserve)
            throw new Error(`Not found reserve id ${reserveId}`);
        const reserveClone = (0, cloneDeep_1.default)(reserve);
        return this.reserveCalculationOperation.getDetailSupplyApy(reserveClone, marketType, currentTimestampMs);
    }
    async getDetailBorrowApy(reserveId) {
        const currentTimestampMs = new Date().getTime();
        const marketType = this.getMarketTypeOfReserve(reserveId);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        const reserve = reserves.find(reserve => reserve.id == reserveId);
        if (!reserve)
            throw new Error(`Not found reserve id ${reserveId}`);
        const reserveClone = (0, cloneDeep_1.default)(reserve);
        return this.reserveCalculationOperation.getDetailBorrowApy(reserveClone, marketType, currentTimestampMs);
    }
    async totalSupplyAPYWithNewAvailableSupplyAmount(reserveId, newAvailableAmount, userAction) {
        const currentTimestampMs = new Date().getTime();
        const marketType = this.getMarketTypeOfReserve(reserveId);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        const reserve = reserves.find(reserve => reserve.id == reserveId);
        if (!reserve)
            throw new Error(`Not found reserve id ${reserveId}`);
        const reserveClone = (0, cloneDeep_1.default)(reserve);
        return this.reserveCalculationOperation.totalSupplyAPYWithNewAvailableSupplyAmount(reserve, marketType, newAvailableAmount, currentTimestampMs, userAction);
    }
    async totalBorrowAPYWithNewBorrowedAmount(reserveId, newAvailableLiquidity, newBorrowedAmount, userAction) {
        const currentTimestampMs = new Date().getTime();
        const marketType = this.getMarketTypeOfReserve(reserveId);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        const reserve = reserves.find(reserve => reserve.id == reserveId);
        if (!reserve)
            throw new Error(`Not found reserve id ${reserveId}`);
        const reserveClone = (0, cloneDeep_1.default)(reserve);
        return this.reserveCalculationOperation.totalBorrowAPYWithNewBorrowedAmount(reserveClone, marketType, newAvailableLiquidity, newBorrowedAmount, currentTimestampMs, userAction);
    }
    getTotalSuppliedUSDValueObligation(marketType) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return new decimal_js_1.Decimal(0);
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.getTotalSuppliedUSDValueObligation(obligationClone, associateReserve, reserveTokenPrice);
    }
    getTotalBorrowedUSDValueObligation(marketType) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return new decimal_js_1.Decimal(0);
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.getTotalBorrowedUSDValueObligation(obligationClone, associateReserve, reserveTokenPrice);
    }
    getDetailSuppliedOnMarketObligation(marketType, reserveIds) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return [];
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return [];
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.getDetailSuppliedOnMarketObligation(obligationClone, associateReserve, reserveTokenPrice, reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves);
    }
    getDetailBorrowedOnMarketObligation(marketType, reserveIds) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return [];
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            return [];
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.getDetailBorrowedOnMarketObligation(obligationClone, associateReserve, reserveTokenPrice, reserveIds ? reserves.filter(reserve => reserveIds.includes(reserve.id)) : reserves);
    }
    calculateCurrentHealthRatioObligation(marketType) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return new decimal_js_1.Decimal(0);
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.calculateCurrentHealthRatioObligation(obligationClone, associateReserve, reserveTokenPrice);
    }
    calculateRemainingBorrowAmount(borrowReserveAddress) {
        const marketType = this.getMarketTypeOfReserve(borrowReserveAddress);
        const borrowReserve = this.reserves.get(marketType)?.find(reserve => reserve.id == borrowReserveAddress);
        if (!borrowReserve)
            return new decimal_js_1.Decimal(0);
        const borrowReserveClone = (0, cloneDeep_1.default)(borrowReserve);
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return new decimal_js_1.Decimal(0);
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.calculateRemainingBorrowAmount(obligationClone, associateReserve, reserveTokenPrice, borrowReserveClone);
    }
    calculateAllowedWithdrawAmount(withdrawReserve) {
        const marketType = this.getMarketTypeOfReserve(withdrawReserve);
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return new decimal_js_1.Decimal(0);
        const obligationClone = (0, cloneDeep_1.default)(obligation);
        const { associateReserve, reserveTokenPrice } = this.getAssociateReserveObligationData(obligationClone, marketType);
        return this.obligationCalculationOperation.calculateAllowedWithdrawAmount(obligationClone, associateReserve, reserveTokenPrice, withdrawReserve, true);
    }
    async getTotalIncentiveRewardStatisticObligation(marketType, reservesIds) {
        const obligation = this.obligations.get(marketType);
        if (!obligation)
            return [];
        const associateReserves = new Map();
        const reserveTokenPrice = new Map();
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        for (const reserve of reserves) {
            associateReserves.set(reserve.id, reserve);
            reserveTokenPrice.set(reserve.id, reserve.liquidity.marketPrice.toDecimalJs());
        }
        ;
        return this.rewardCalculationOperation.getTotalIncentiveRewardStatisticObligation(obligation, associateReserves, reserveTokenPrice, marketType, reservesIds);
    }
    getAssociateReserveObligationData(obligation, marketType) {
        const reserves = this.reserves.get(marketType);
        if (!reserves)
            throw new Error(`Not found reserves in market: ${marketType}`);
        const associateReserve = new Map();
        const reserveTokenPrice = new Map();
        for (const deposit of obligation.deposits) {
            const reserve = reserves.find(reserve => reserve.id == deposit);
            if (reserve) {
                const reserveClone = (0, cloneDeep_1.default)(reserve);
                associateReserve.set(reserve.id, reserveClone);
                reserveTokenPrice.set(reserve.id, reserveClone.liquidity.marketPrice.toDecimalJs());
            }
        }
        for (const borrow of obligation.borrows) {
            const reserve = reserves.find(reserve => reserve.id == borrow);
            if (reserve) {
                const reserveClone = (0, cloneDeep_1.default)(reserve);
                associateReserve.set(reserve.id, reserve);
                reserveTokenPrice.set(reserve.id, reserve.liquidity.marketPrice.toDecimalJs());
            }
        }
        return {
            associateReserve,
            reserveTokenPrice,
        };
    }
    getMarketTypeOfReserve(reserveId) {
        for (const [marketId, reserves] of this.reserves.entries()) {
            if (reserves.some(r => r.id === reserveId)) {
                return marketId;
            }
        }
        throw new Error(`Not found reserve market type of reserve id ${reserveId}`);
    }
}
exports.ElendClient = ElendClient;
//# sourceMappingURL=elend-client.js.map