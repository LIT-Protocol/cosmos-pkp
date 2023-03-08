import { decodePubkey, decodeTxRaw, DirectSecp256k1HdWallet, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient } from "./stargate/src";
import { SigningStargateClientWithLit } from "./stargateClientWithLit";
import { ethers } from "ethers";
import { Keccak256, ripemd160, Secp256k1, sha256 } from "@cosmjs/crypto";
import EthCrypto from "eth-crypto";
import { fromBase64, fromHex, toBase64, toBech32 } from "@cosmjs/encoding";
import { compressPublicKey, pkpPubKeyToCosmosAddress } from "./helpers/litHelpers";

// note: can probably delete
//
// $protobuf.util.Long = Long;
// $protobuf.configure();

// const pkpAuthSig = {
//   sig: "0x2bdede6164f56a601fc17a8a78327d28b54e87cf3fa20373fca1d73b804566736d76efe2dd79a4627870a50e66e1a9050ca333b6f98d9415d8bca424980611ca1c",
//   derivedVia: "web3.eth.personal.sign",
//   signedMessage:
//     "localhost wants you to sign in with your Ethereum account:\n0x9D1a5EC58232A894eBFcB5e466E3075b23101B89\n\nThis is a key for Partiful\n\nURI: https://localhost/login\nVersion: 1\nChain ID: 1\nNonce: 1LF00rraLO4f7ZSIt\nIssued At: 2022-06-03T05:59:09.959Z",
//   address: "0x9D1a5EC58232A894eBFcB5e466E3075b23101B89",
// }
// const pkpPublicKey = '0x04e0fe6a5e9447112a272b3bfea3cbcb48a730c731d9edd434417d30f5b25966cb8543cece8ba67fd6bbbb9ba952e28db541de9a898cca0257e5479033c3b7b021'

const keplrMnemonicString = 'either control crazy lonely police foam swim replace salute snap quick harbor'
const keplrAddress = 'cosmos16a6zyjwyww6scfa44s9jekdwwjfjrpppajk9d0'
const keplrPubKey = new Uint8Array([
  2, 246,  84,  18,  18,  44, 210, 108,
  254, 182, 178, 122, 254, 228,  57, 254,
  89, 134, 104,  35, 144,  69, 137,  41,
  155, 100, 240,  40, 193, 126,  48, 195,
  130
]);

const pkpOwnerPubKey = "0x04507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec8d7c893d10b65c8dd72a296084e8729dfeb13265c3d33d6b6fd6bad92616efad"
const pkpOwnerCompressedPubKey = "0x03507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec"
const pkpOwnerAddress = '0x20623933681a53D5ee48959eC1770BeA7afA4eDe'

const pkpPublicKey = "0x0460579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952217c60c945c434dfb68bfc1e5b7cd89b41d1180bdd12b76a9f1d2f82b6d0d6db"
const pkpCompressedPublicKey = "0x0360579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952"
const pkpCosmosAddress = 'cosmos1y6nj302f63xanqvmkyx8acc2cq2xsqlwmzfzup'
// const pkpCosmosAddress = 'cosmos12ptkcxku9ry5htp6wq0jw8xyln4z3ny7emgwmf'
const pkpEthAddress = "0x7Fd02EEDaE344ecdC95b53086d537bD259c713fb"
// const pkpCosmosPubKey = [
//   3,  96,  87, 156, 176, 212, 187,  72,
//   70, 186,  67, 160,   1, 231, 236, 108,
//   66, 228, 219,  98, 243, 185, 196,   3,
//   88, 223,  49,  57,  46, 144, 178,  73,
//   82
// ]

const pkpAuthSig = {
  "sig": "0x4348d34c6b6e461b84ffbaf0b093bce8110eab3ee644ef4a73afda71ad77c0371d349cd2837e36ee7b4847c2ec0b5f7ad94781a34bf13533690c03f4f296e0d71c",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "lit-swap-playground.netlify.app wants you to sign in with your Ethereum account:\n0x20623933681a53D5ee48959eC1770BeA7afA4eDe\n\n\nURI: https://lit-swap-playground.netlify.app/\nVersion: 1\nChain ID: 137\nNonce: jPKR8TYXLgYKFNE4d\nIssued At: 2023-03-08T17:15:06.230Z\nExpiration Time: 2023-03-15T17:15:06.207Z",
  "address": "0x20623933681a53D5ee48959eC1770BeA7afA4eDe"
}

const amount = [{ denom: "uatom", amount: "100000" }]
const gasFee = {
  amount: [{ denom: "uatom", amount: "1000" }],
  gas: "10000",
}

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const checkPkpTokenOwnership = async () => {
  const client = await StargateClient.connect(rpc)
  // console.log('client', client)
  const pkpTokens = await client.getAllBalances(pkpCosmosAddress);
  console.log('pkpTokens', pkpTokens)
  const keplrTokens = await client.getAllBalances(keplrAddress);
  console.log('keplrTokens', keplrTokens)
}

// checkPkpTokenOwnership().then(res => {
//   console.log('checkPkpTokenOwnership res:', res);
// })

function convertCosmosPubKeyToEthAddress(publicKey: any): any {
  const pubKey = Secp256k1.uncompressPubkey(publicKey);
  console.log('pubKey', pubKey)
  const hash = new Keccak256(pubKey.slice(1)).digest();
  const lastTwentyBytes = hash.slice(-20);
  const address = ethers.utils.hexlify(lastTwentyBytes);
  return address;
}

// console.log('convertCosmosAddressToEthAddress', convertCosmosPubKeyToEthAddress(pkpCosmosPubKey))

// check making a PKP Cosmos address from a PKP hex public key
const makePkpCosmosAddressFromPubKey = (publicKey: any) => {
  let cleanedPubKey = publicKey;
  if (publicKey.startsWith('0x')) {
    cleanedPubKey = publicKey.slice(2);
  }
  const compressedPublicKey = EthCrypto.publicKey.compress(cleanedPubKey);

  const uint8ArrayFromHex = fromHex(compressedPublicKey)
  console.log("uint8ArrayFromHex", uint8ArrayFromHex)
  const base64CompressedKey = toBase64(uint8ArrayFromHex)
  console.log('base64CompressedKey', base64CompressedKey)
  const uint8PubKey = fromBase64(base64CompressedKey);
  console.log('uint8PubKey', uint8PubKey)
  const uint8CompressedPublicKey = Uint8Array.from(atob(base64CompressedKey), (c) => c.charCodeAt(0));
  console.log('uint8CompressedPublicKey', uint8CompressedPublicKey)
  // const address = ripemd160(sha256(uint8CompressedPublicKey));
  // return toBech32('cosmos', address);
}

console.log('PKP Cosmos Address:', makePkpCosmosAddressFromPubKey(pkpPublicKey));
// console.log('pkpPubKeyToCosmosAddress:', pkpPubKeyToCosmosAddress(pkpPublicKey));


// note: bring back once logging is good
async function testSignWithLit() {
  console.log('Sign with Lit');
  const pkpSigner = await SigningStargateClientWithLit.createClient(pkpPublicKey, pkpAuthSig, rpc)
  // console.log('Signed Tx is:', pkpSigner);
  const signedTx = await pkpSigner.sendTokens(keplrAddress, amount, gasFee);
  console.log('signedTx is:', signedTx);
  return signedTx;
}

testSignWithLit().then((res => {
  console.log('SignCosmosWithLit res:', res);
}))

// note: for exploring stargate code
const runSigning = async() => {
  // console.log('fs', fs.readFile)
  await checkPkpTokenOwnership();
  const getSignerFromMnemonic = async () => {
    return DirectSecp256k1HdWallet.fromMnemonic((keplrMnemonicString).toString(), {
      prefix: "cosmos",
    })
  }

  const signer = await getSignerFromMnemonic()
  const accountInfo = (await signer.getAccounts())
  console.log("accountInfo", accountInfo)
  const signingClient = await SigningStargateClient.connectWithSigner(rpc, signer)
  console.log(
    "With signing client, chain id:",
    await signingClient.getChainId(),
    ", height:",
    await signingClient.getHeight()
  )

  // const sendRes = await signingClient.sendTokens(
  await signingClient.sendTokens(
    keplrAddress,
    pkpCosmosAddress,
    [{ denom: "uatom", amount: "200000" }],
    {
      amount: [{ denom: "uatom", amount: "10000" }],
      gas: "100000",
    }
  )

  return 'done'
}

// runSigning().then(res => {
//   console.log('res', res)
//   return;
// })

