"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pkpPubKeyToCosmosAddress = void 0;
const crypto_1 = require("@cosmjs/crypto");
const encoding_1 = require("@cosmjs/encoding");
const eth_crypto_1 = __importDefault(require("eth-crypto"));
function pkpPubKeyToCosmosAddress(publicKey) {
    let cleanedPubKey = publicKey;
    if (publicKey.startsWith('0x')) {
        cleanedPubKey = publicKey.slice(2);
    }
    const compressedPublicKey = eth_crypto_1.default.publicKey.compress(cleanedPubKey);
    const encodedCompressedPublicKey = Buffer.from(compressedPublicKey);
    const address = (0, crypto_1.ripemd160)((0, crypto_1.sha256)(encodedCompressedPublicKey));
    return (0, encoding_1.toBech32)('cosmos', address);
}
exports.pkpPubKeyToCosmosAddress = pkpPubKeyToCosmosAddress;
//# sourceMappingURL=litHelpers.ts.map