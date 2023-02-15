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

// note: can probably delete
// import * as $protobuf from 'protobufjs/minimal';
//
// $protobuf.util.Long = Long;
// $protobuf.configure();

const authSig = {
  sig: "0x2bdede6164f56a601fc17a8a78327d28b54e87cf3fa20373fca1d73b804566736d76efe2dd79a4627870a50e66e1a9050ca333b6f98d9415d8bca424980611ca1c",
  derivedVia: "web3.eth.personal.sign",
  signedMessage:
    "localhost wants you to sign in with your Ethereum account:\n0x9D1a5EC58232A894eBFcB5e466E3075b23101B89\n\nThis is a key for Partiful\n\nURI: https://localhost/login\nVersion: 1\nChain ID: 1\nNonce: 1LF00rraLO4f7ZSIt\nIssued At: 2022-06-03T05:59:09.959Z",
  address: "0x9D1a5EC58232A894eBFcB5e466E3075b23101B89",
}
const demoPublicKey = '0x04e0fe6a5e9447112a272b3bfea3cbcb48a730c731d9edd434417d30f5b25966cb8543cece8ba67fd6bbbb9ba952e28db541de9a898cca0257e5479033c3b7b021'

// const aliceMnemonicString = 'avoid sphere gasp warm space episode recycle antenna begin slush snow birth describe attract pull stove crash camera birth copper skill ahead pause embody'
const keplrMnemonicString = 'either control crazy lonely police foam swim replace salute snap quick harbor'
const keplrAddress = 'cosmos16a6zyjwyww6scfa44s9jekdwwjfjrpppajk9d0'

const pkpPublicKey = "0x04d7bd70bcd00939073ecccf4ddb7367293433425b80d9b16e07824c0856c8907ee0a6d118b8dd6d0b954a0848693d2f02fc48e4900b5114d07dc3fcc32936ee5b"
const pkpAddress = 'cosmos1ltk0lznn6gltsevh3v6z0ju8dxzuh5gatzh8f8'
const pkpEthAddress = '0x744E13812660B34CeD3973529b4d95CF34d483A4'
const pkpAuthSig = {
  "sig": "0x2b4a8398d17f6767de01e8afce170305685f68880de9d89e53af09c01e465171238bdb5c033b1276b4d78ff8431a9da177940c80193fb8a5101091dd24b82c111c",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "lit-swap-playground.netlify.app wants you to sign in with your Ethereum account:\n0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070\n\n\nURI: https://lit-swap-playground.netlify.app/\nVersion: 1\nChain ID: 80001\nNonce: LsTp0zm9F0bn7zJyJ\nIssued At: 2023-02-15T18:07:02.364Z\nExpiration Time: 2023-02-22T18:07:02.343Z",
  "address": "0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070"
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
  // const client = await StargateClient.connect(rpc)
  // const pkpAccountInfo = await client.getAccount(keplrAddress)
  // console.log('pkpAccountInfo', pkpAccountInfo)
  // const mockPkpPubKeyObj = {
  //   type: 'tendermint/PubKeySecp256k1',
  //   value: 'A9e9cLzQCTkHPszPTdtzZyk0M0JbgNmxbgeCTAhWyJB+'
  // }
  // // @ts-ignore
  // const makeAddress = compressedPubKeyToAddress(pkpAccountInfo?.pubkey.value)
  // const pkpMakeAddress = pkpPubKeyToCosmosAddress(pkpPublicKey)
  // const pkpBuiltInAddress = pubkeyToRawAddress(mockPkpPubKeyObj)
  // // const makeAddress = pkpPubKeyToCosmosAddress(pkpAccountInfo?.pubkey)
  // console.log('makeAddress', makeAddress)
  // console.log('pkpMakeAddress', pkpMakeAddress)
  // console.log('pkpBuiltInAddress', pkpBuiltInAddress)
  // const pkpAddress = ethers.utils.computeAddress(pkpPublicKey)
  // console.log('pkpAddress', pkpAddress)

  console.log('Sign with Lit');
  console.log('Auth Sig is:', authSig);
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
  const alice = (await signer.getAccounts())[0].address
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

