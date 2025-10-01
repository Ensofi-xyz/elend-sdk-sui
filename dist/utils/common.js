"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = exports.i64ToBigInt = exports.getTokenTypeForReserve = exports.SLOTS_PER_YEAR = exports.SLOTS_PER_DAY = exports.SLOTS_PER_HOUR = exports.SLOTS_PER_MINUTE = exports.SLOTS_PER_SECOND = void 0;
exports.calculateAPYFromAPR = calculateAPYFromAPR;
exports.retry = retry;
const decimal_js_1 = require("decimal.js");
exports.SLOTS_PER_SECOND = 2;
exports.SLOTS_PER_MINUTE = exports.SLOTS_PER_SECOND * 60;
exports.SLOTS_PER_HOUR = exports.SLOTS_PER_MINUTE * 60;
exports.SLOTS_PER_DAY = exports.SLOTS_PER_HOUR * 24;
exports.SLOTS_PER_YEAR = exports.SLOTS_PER_DAY * 365;
const getTokenTypeForReserve = (reserveId, packageConfig) => {
    const reserves = packageConfig.reserves;
    for (const [tokenType, reserveInfo] of Object.entries(reserves)) {
        if (reserveInfo.id === reserveId) {
            return tokenType;
        }
    }
    return null;
};
exports.getTokenTypeForReserve = getTokenTypeForReserve;
const i64ToBigInt = (magnitude, negative) => {
    return negative ? -magnitude : magnitude;
};
exports.i64ToBigInt = i64ToBigInt;
const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.wait = wait;
function calculateAPYFromAPR(apr) {
    const apy = new decimal_js_1.Decimal(1).plus(new decimal_js_1.Decimal(apr).dividedBy(exports.SLOTS_PER_YEAR)).toNumber() ** exports.SLOTS_PER_YEAR - 1;
    return apy;
}
async function retry(fn, delay, maxRetries) {
    return await recall(fn, delay, 0, maxRetries);
}
async function recall(fn, delay, retries, maxRetries) {
    try {
        return await fn();
    }
    catch (err) {
        if (retries > maxRetries) {
            throw err;
        }
        await (0, exports.wait)(delay);
    }
    return await recall(fn, delay, retries + 1, maxRetries);
}
//# sourceMappingURL=common.js.map