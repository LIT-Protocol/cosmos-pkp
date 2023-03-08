import * as bitcoinjs from "bitcoinjs-lib";
import EthCrypto from "eth-crypto";
import { fromBase64, fromHex, toBase64, toBech32 } from "@cosmjs/encoding";
import { ripemd160, sha256 } from "@cosmjs/crypto";
import { bech32 } from "bech32";

const pkpOwnerPubKey = "0x04507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec8d7c893d10b65c8dd72a296084e8729dfeb13265c3d33d6b6fd6bad92616efad"
const pkpOwnerCompressedPubKey = "0x03507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec"
const pkpOwnerAddress = '0x20623933681a53D5ee48959eC1770BeA7afA4eDe'

const pkpPublicKey = "0x0460579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952217c60c945c434dfb68bfc1e5b7cd89b41d1180bdd12b76a9f1d2f82b6d0d6db"
const pkpCompressedPublicKey = "0x0360579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952"
const pkpCosmosAddress = 'cosmos1y6nj302f63xanqvmkyx8acc2cq2xsqlwmzfzup'
const pkpEthAddress = "0x7Fd02EEDaE344ecdC95b53086d537bD259c713fb"

const pkpCosmosPubKey = [
  3,  96,  87, 156, 176, 212, 187,  72,
  70, 186,  67, 160,   1, 231, 236, 108,
  66, 228, 219,  98, 243, 185, 196,   3,
  88, 223,  49,  57,  46, 144, 178,  73,
  82
]

function getCosmosAddressWBitcoin(pubkeyBuffer: Buffer) {
  const hash = bitcoinjs.crypto.sha256(pubkeyBuffer);
  const ripemd160 = bitcoinjs.crypto.ripemd160(hash);

  // first apply the Amino encoding process
  const aminoPrefix = Buffer.from("eb5ae987", "hex");
  const aminoBuffer = Buffer.concat([aminoPrefix, ripemd160]);

  // then bech32 encode the result
  const cosmosAddress = bitcoinjs.address.toBech32(
    aminoBuffer,
    0,
    "cosmos"
  );

  return cosmosAddress;
}

const compressedPublicKey = EthCrypto.publicKey.compress(pkpPublicKey.slice(2));
console.log('compressedPublicKey', compressedPublicKey)
const publicKeyBuffer = Buffer.from(compressedPublicKey, 'hex')

// get cosmos address from the public key
const cosmosAddressWBitcoin = getCosmosAddressWBitcoin(publicKeyBuffer);
console.log('cosmosAddressWBitcoin', cosmosAddressWBitcoin)

// check making a PKP Cosmos address from a PKP hex public key
const makePkpCosmosAddressFromPubKey = (publicKey: any) => {
  let cleanedPubKey = publicKey;
  if (publicKey.startsWith('0x')) {
    cleanedPubKey = publicKey.slice(2);
  }
  const compressedPublicKey = EthCrypto.publicKey.compress(cleanedPubKey);
  const concatenatedCosmosKey = 'eb5ae987' + 21 + compressedPublicKey;

  const uint8PubKey = fromHex(concatenatedCosmosKey);
  const address = ripemd160(sha256(uint8PubKey));
  return toBech32('cosmos', address);
}

console.log('PKP Cosmos Address w/ eth:', makePkpCosmosAddressFromPubKey(pkpPublicKey));

const testPublicKeyBytes = (publicKey: string) => {
  let cleanedPubKey = publicKey;
  if (publicKey.startsWith('0x')) {
    cleanedPubKey = publicKey.slice(2);
  }
  const secp256k1PublicKey = cleanedPubKey;
  const publicKeyBytes = Buffer.from(secp256k1PublicKey, 'hex');
  const publicKeyBytesWithoutFormat = publicKeyBytes.slice(1);
  const hashed = ripemd160(sha256(publicKeyBytesWithoutFormat));
  const prefix = 'cosmos';
  const words = bech32.toWords(hashed);
  console.log('words', words)
  const cosmosAddress = bech32.encode(prefix, words);
  console.log('cosmosAddress', cosmosAddress)
  return cosmosAddress;
}

console.log('testPublicKeyBytes', testPublicKeyBytes(pkpPublicKey))