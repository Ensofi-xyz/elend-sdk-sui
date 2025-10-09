"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignerByPrivateKey = exports.getSuiClientInstance = void 0;
const lodash_1 = require("lodash");
const client_1 = require("@mysten/sui/client");
const cryptography_1 = require("@mysten/sui/cryptography");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const getSuiClientInstance = (rpcUrl, wsRpcUrl, rpcApiKey) => {
    if (!(0, lodash_1.isNil)(rpcApiKey)) {
        return new client_1.SuiClient({
            transport: new client_1.SuiHTTPTransport({
                url: rpcUrl,
                WebSocketConstructor: WebSocket,
                websocket: {
                    url: `${wsRpcUrl}/${rpcApiKey}`,
                },
                rpc: {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-allthatnode-api-key': rpcApiKey,
                    },
                },
            }),
        });
    }
    else {
        return new client_1.SuiClient({
            transport: new client_1.SuiHTTPTransport({
                url: rpcUrl,
                WebSocketConstructor: WebSocket,
                websocket: {
                    url: wsRpcUrl,
                },
            }),
        });
    }
};
exports.getSuiClientInstance = getSuiClientInstance;
const getSignerByPrivateKey = (privateKey) => {
    const { schema, secretKey } = (0, cryptography_1.decodeSuiPrivateKey)(privateKey);
    return ed25519_1.Ed25519Keypair.fromSecretKey(secretKey, {
        skipValidation: true,
    });
};
exports.getSignerByPrivateKey = getSignerByPrivateKey;
//# sourceMappingURL=sui-client.js.map