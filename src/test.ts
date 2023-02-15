import {
  hexPubKeyToRawAddress,
  pkpPubKeyToCosmosAddress,
  compressedPubKeyToAddress
} from "./helpers/litHelpers";
import { signCosmosTxWithLit } from "./signWithLit";
import { decodePubkey, decodeTxRaw, DirectSecp256k1HdWallet, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient } from "./stargate/src";
import { SigningStargateClientWithLit } from "./stargateClientWithLit";
import { pubkeyToAddress, pubkeyToRawAddress } from "@cosmjs/amino";
import { ethers } from "ethers";
import { toBase64 } from "@cosmjs/encoding";

// note: can probably delete
// import * as $protobuf from 'protobufjs/minimal';
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

// const aliceMnemonicString = 'avoid sphere gasp warm space episode recycle antenna begin slush snow birth describe attract pull stove crash camera birth copper skill ahead pause embody'
const keplrMnemonicString = 'either control crazy lonely police foam swim replace salute snap quick harbor'
const keplrAddress = 'cosmos16a6zyjwyww6scfa44s9jekdwwjfjrpppajk9d0'
const keplrPubKey = new Uint8Array([
  2, 246,  84,  18,  18,  44, 210, 108,
  254, 182, 178, 122, 254, 228,  57, 254,
  89, 134, 104,  35, 144,  69, 137,  41,
  155, 100, 240,  40, 193, 126,  48, 195,
  130
]);

const pkpPublicKey = "0x0460579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952217c60c945c434dfb68bfc1e5b7cd89b41d1180bdd12b76a9f1d2f82b6d0d6db"
const pkpAddress = 'cosmos1y6nj302f63xanqvmkyx8acc2cq2xsqlwmzfzup'
const pkpEthAddress = '0x7Fd02EEDaE344ecdC95b53086d537bD259c713fb'
const pkpAuthSig = {
  "sig": "0x863556198ca206ad61759327e9811f51b6c999d69523743c502d43d5633c8371534a1090a4f57d017c63c4d72b3129d2563631529dab3e795e4be72b161484111b",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "lit-swap-playground.netlify.app wants you to sign in with your Ethereum account:\n0x20623933681a53D5ee48959eC1770BeA7afA4eDe\n\n\nURI: https://lit-swap-playground.netlify.app/\nVersion: 1\nChain ID: 80001\nNonce: rqkwQY3s0Z5W5443h\nIssued At: 2023-02-15T23:43:16.300Z\nExpiration Time: 2023-02-22T23:43:16.278Z",
  "address": "0x20623933681a53D5ee48959eC1770BeA7afA4eDe"
}

const amount = [{ denom: "uatom", amount: "100000" }]
const gasFee = {
  amount: [{ denom: "uatom", amount: "500" }],
  gas: "200000",
}

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const checkPkpTokenOwnership = async () => {
  const client = await StargateClient.connect(rpc)
  // console.log('client', client)
  const pkpTokens = await client.getAllBalances(pkpAddress);
  console.log('pkpTokens', pkpTokens)
}

checkPkpTokenOwnership().then(res => {
  console.log('checkPkpTokenOwnership res:', res);
})

// note: bring back once logging is good
async function testSignWithLit() {
  console.log('Sign with Lit');
  const pkpSigner = await SigningStargateClientWithLit.createClient(pkpPublicKey, pkpAuthSig, rpc)
  console.log('Signed Tx is:', pkpSigner);
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
  const alice = (await signer.getAccounts())
  console.log("Alice's address from signer", alice)
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
    pkpAddress,
    [{ denom: "uatom", amount: "100000" }],
    {
      amount: [{ denom: "uatom", amount: "500" }],
      gas: "200000",
    }
  )

  // console.log('sendRes', sendRes)
  return 'done'
}

// runSigning().then(res => {
//   console.log('res', res)
//   return;
// })

