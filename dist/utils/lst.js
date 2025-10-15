"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHaSuiLstInterest = exports.LSTAsset = void 0;
const decimal_js_1 = require("decimal.js");
var LSTAsset;
(function (LSTAsset) {
    LSTAsset["HASUI"] = "haSUI";
})(LSTAsset || (exports.LSTAsset = LSTAsset = {}));
const haSuiLstEndpoint = 'https://www.haedal.xyz/api/stats/home';
const getHaSuiLstInterest = async () => {
    try {
        const response = (await fetch(haSuiLstEndpoint));
        const apy = (await response.json()).data.apy;
        return new decimal_js_1.Decimal(apy).div(100);
    }
    catch (error) {
        console.error('Error fetching haSUI APY:', error);
        return new decimal_js_1.Decimal(0);
    }
};
exports.getHaSuiLstInterest = getHaSuiLstInterest;
//# sourceMappingURL=lst.js.map