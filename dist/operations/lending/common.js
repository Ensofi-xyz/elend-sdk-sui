"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshReserves = void 0;
const lodash_1 = require("lodash");
const pyth_sui_js_1 = require("@pythnetwork/pyth-sui-js");
const constant_1 = require("../../common/constant");
const refreshReserves = async (tx, args) => {
    const { obligationData, reserve, networkConfig, pythClient, contract } = args;
    const packageInfo = networkConfig.packages[networkConfig.latestVersion];
    const reservesToRefresh = !(0, lodash_1.isNil)(obligationData) ? new Set([...obligationData.deposits, ...obligationData.borrows]) : new Set();
    reservesToRefresh.add(reserve);
    const reserves = packageInfo.reserves;
    const pythPriceFeedIds = packageInfo.pythPriceFeedId;
    const reservePythPriceFeedIds = new Map();
    for (const [tokenType, reserve] of Object.entries(reserves)) {
        (this, reservePythPriceFeedIds.set(reserve.id, pythPriceFeedIds[tokenType]));
    }
    const pythConnection = new pyth_sui_js_1.SuiPriceServiceConnection(networkConfig.pythHermesUrl);
    const priceFeedIdsNeedUpdate = [];
    for (const reserveToRefresh of reservesToRefresh) {
        const pythPriceFeedId = reservePythPriceFeedIds.get(reserveToRefresh);
        if ((0, lodash_1.isNil)(pythPriceFeedId))
            throw Error('Not found pyth price feed id of associate reserves');
        priceFeedIdsNeedUpdate.push(pythPriceFeedId);
    }
    let priceFeedObjectReserve = null;
    if (priceFeedIdsNeedUpdate.length === Array.from(reservesToRefresh).length) {
        const priceUpdateData = await pythConnection.getPriceFeedsUpdateData(priceFeedIdsNeedUpdate);
        const priceInfoObjects = await pythClient.updatePriceFeeds(tx, priceUpdateData, priceFeedIdsNeedUpdate);
        for (let i = 0; i < Array.from(reservesToRefresh).length; i++) {
            const reserveToRefresh = Array.from(reservesToRefresh)[i];
            if (reserveToRefresh == reserve) {
                priceFeedObjectReserve = priceInfoObjects[i];
            }
            let tokenType = Object.keys(reserves).find(tokenType => reserves[tokenType].id == reserveToRefresh);
            if ((0, lodash_1.isNil)(tokenType))
                throw Error('not found token type of associate reserves');
            contract.refreshReserve(tx, [packageInfo.marketType['MAIN_POOL'], tokenType], {
                version: packageInfo.version.id,
                reserve: reserveToRefresh,
                priceInfoObject: priceInfoObjects[i],
                clock: constant_1.SUI_SYSTEM_CLOCK,
            });
        }
    }
    else {
        throw Error('Can not get price update for reserve');
    }
    if (priceFeedObjectReserve === null) {
        throw Error('Failed to assign priceFeedObjectReserve');
    }
    return priceFeedObjectReserve;
};
exports.refreshReserves = refreshReserves;
//# sourceMappingURL=common.js.map