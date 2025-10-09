"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitSignAndExecuteTransactionIX = void 0;
const waitSignAndExecuteTransactionIX = async (suiClient, tx, signer) => {
    const res = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer,
    });
    const confirmedRes = await suiClient.waitForTransaction({
        digest: res.digest,
    });
    return confirmedRes;
};
exports.waitSignAndExecuteTransactionIX = waitSignAndExecuteTransactionIX;
//# sourceMappingURL=transaction.js.map