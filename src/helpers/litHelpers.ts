import { Keccak256, ripemd160, Secp256k1, sha256 } from "@cosmjs/crypto";
import { fromBase64, fromHex, toBase64, toBech32, toHex } from "@cosmjs/encoding";
import EthCrypto from "eth-crypto";
import { ethers } from "ethers";

// attempt #2
// tendermint attempt using concatenation
// https://github.com/tendermint/tendermint/blob/d419fffe18531317c28c29a292ad7d253f6cafdf/docs/spec/blockchain/encoding.md#public-key-cryptography
/*function pkpPubKeyToCosmosAddress(publicKey: string) : string{
    const compressedPublicKey = compressPublicKey(publicKey);
    const concatenatedCosmosKey = 'eb5ae987' + 21 + compressedPublicKey;
    const uint8ArrayFromHex = fromHex(concatenatedCosmosKey);
    return compressedPubKeyToAddress(uint8ArrayFromHex);
}

function compressedPubKeyToAddress(publicKey: Uint8Array): any {
    const address = ripemd160(sha256(publicKey));
    return toBech32('cosmos', address);
}

function compressPublicKey(publicKey: string): string {
    let cleanedPubKey = publicKey;
    if (publicKey.startsWith('0x')) {
        cleanedPubKey = publicKey.slice(2);
    }
    return EthCrypto.publicKey.compress(cleanedPubKey);
}*/

// attempt #1
// reverse engineered from the cosmos sdk github issue
// https://github.com/cosmos/cosmjs/issues/1044
function pkpPubKeyToCosmosAddress(publicKey: string) : string{
    const compressedPublicKey = compressPublicKey(publicKey);
    const uint8ArrayFromHex = fromHex(compressedPublicKey);
    const compressedBase64PubKey = toBase64(uint8ArrayFromHex);
    return compressedPubKeyToAddress(compressedBase64PubKey);
}

function compressedPubKeyToAddress(publicKey: string): any {
    const encodedCompressedPublicKey = Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0));
    const address = ripemd160(sha256(encodedCompressedPublicKey));
    return toBech32('cosmos', address);
}

function compressPublicKey(publicKey: string): string {
    let cleanedPubKey = publicKey;
    if (publicKey.startsWith('0x')) {
        cleanedPubKey = publicKey.slice(2);
    }
    return EthCrypto.publicKey.compress(cleanedPubKey);
}

// original cosmosPublicKey to EthAddress from the github issue
// https://github.com/cosmos/cosmjs/issues/1044
function convertCosmosPubKeyToEthAddress(publicKey: any): any {
    const pubKey = Secp256k1.uncompressPubkey(publicKey);
    const hash = new Keccak256(pubKey.slice(1)).digest();
    const lastTwentyBytes = hash.slice(-20);
    const address = ethers.utils.hexlify(lastTwentyBytes);
    return address;
}

function hexToBase64(signature: string): string {
    const uint8Array = fromBase64(signature);
    return toHex(uint8Array);
}

function hexSigToBase64Sig(signature: string): string {
    let cleanedSignature = signature;
    if (signature.startsWith('0x')) {
        cleanedSignature = signature.slice(2);
    }
    const binaryString = Buffer.from(cleanedSignature, 'hex').toString('binary');
    return Buffer.from(binaryString, 'binary').toString('base64');
}

function makeLogReadableInTerminal(log: any) {
    return JSON.stringify(log, null, 2);
}

export {
    compressedPubKeyToAddress,
    pkpPubKeyToCosmosAddress,
    compressPublicKey,
    convertCosmosPubKeyToEthAddress,
    hexToBase64,
    hexSigToBase64Sig,
    makeLogReadableInTerminal,
}

