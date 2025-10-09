"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitCoin = exports.getCoinToSplit = exports.mergeAllCoin = void 0;
const lodash_1 = require("lodash");
const common_1 = require("./common");
const SUI_COIN_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const mergeAllCoin = async (coins, tx) => {
    if (coins.length == 0) {
        console.log('No coins to merge');
        throw new Error('No coins to merge');
    }
    else if (coins.length == 1) {
        console.log('Only one coin to merge');
        return coins[0].coinObjectId;
    }
    const coinsFiltered = coins.map(coin => coin.coinObjectId);
    const [destinationCoin, ...restCoin] = coinsFiltered;
    tx.mergeCoins(destinationCoin, restCoin);
    return destinationCoin;
};
exports.mergeAllCoin = mergeAllCoin;
const getCoinToSplit = async (suiClient, tx, walletAddress, amount, coinType) => {
    const coins = [];
    let cursor = null;
    while (true) {
        const paginatedCoins = await suiClient.getAllCoins({
            owner: walletAddress,
            cursor,
        });
        cursor = !(0, lodash_1.isNil)(paginatedCoins.nextCursor) ? paginatedCoins.nextCursor : null;
        coinType = coinType == SUI_COIN_TYPE ? '0x2::sui::SUI' : coinType;
        for (const coin of paginatedCoins.data) {
            if (coin.coinType === coinType && Number(coin.balance) > amount) {
                return coin.coinObjectId;
            }
            else if (coin.coinType === coinType) {
                coins.push(coin);
            }
        }
        if (!paginatedCoins.hasNextPage)
            break;
        await (0, common_1.wait)(100);
    }
    return await (0, exports.mergeAllCoin)(coins, tx);
};
exports.getCoinToSplit = getCoinToSplit;
const splitCoin = async (suiClient, tx, walletAddress, coinType, amounts) => {
    const balance = await suiClient.getBalance({
        owner: walletAddress,
        coinType,
    });
    const totalAmount = amounts.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    if (BigInt(balance.totalBalance) < totalAmount) {
        throw new Error(`Not enough balance coin type ${coinType} to split from ${walletAddress}`);
    }
    const coinToSplit = await (0, exports.getCoinToSplit)(suiClient, tx, walletAddress, totalAmount, coinType);
    const serializedAmounts = amounts.map(amount => tx.pure.u64(amount));
    const coinsSplitted = tx.splitCoins(coinToSplit, serializedAmounts);
    return coinsSplitted;
};
exports.splitCoin = splitCoin;
//# sourceMappingURL=split-coin.js.map