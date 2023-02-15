import { ripemd160, sha256 } from "@cosmjs/crypto";
import { fromBase64, fromHex, toBase64, toBech32 } from "@cosmjs/encoding";
import EthCrypto from "eth-crypto";
import { isSecp256k1Pubkey, rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";

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

function hexToBase64(signature: string): string {
    const binaryString = Buffer.from(signature, 'hex').toString('binary');
    return Buffer.from(binaryString, 'binary').toString('base64');
}

function hexSigToBase64Sig(signature: string): string {
    let cleanedSignature = signature;
    if (signature.startsWith('0x')) {
        cleanedSignature = signature.slice(2);
    }
    const binaryString = Buffer.from(cleanedSignature, 'hex').toString('binary');
    return Buffer.from(binaryString, 'binary').toString('base64');
}

function hexPubKeyToRawAddress(hexPubKey: any): any {
    let cleanedPubKey = hexPubKey;
    if (hexPubKey.startsWith('0x')) {
        cleanedPubKey = hexPubKey.slice(2);
    }
    const compressedBase64PubKey = Buffer.from(cleanedPubKey, 'hex').toString('base64');
    const rawAddress = fromBase64(compressedBase64PubKey);
    // const rawAddress = rawSecp256k1PubkeyToRawAddress(pubkeyData)
    const address = ripemd160(sha256(rawAddress));
    return toBech32('cosmos', address);
}

function base64ToUint8Array(base64: string) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

function makeLogReadableInTerminal(log: any) {
    return JSON.stringify(log, null, 2);
}

export {
    compressedPubKeyToAddress,
    hexPubKeyToRawAddress,
    pkpPubKeyToCosmosAddress,
    compressPublicKey,
    hexToBase64,
    hexSigToBase64Sig,
    base64ToUint8Array,
    makeLogReadableInTerminal,
}