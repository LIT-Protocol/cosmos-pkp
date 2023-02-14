import {
  hexPubKeyToRawAddress,
  pkpPubKeyToCosmosAddress,
  compressedPubKeyToAddress
} from "./helpers/litHelpers";
import { signCosmosTxWithLit } from "./signWithLit";
import { decodePubkey, decodeTxRaw, DirectSecp256k1HdWallet, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient } from "./stargate/src";
import { fromBase64 } from "@cosmjs/encoding";
import Long from "long";
import cosmosclient from '@cosmos-client/core';
import { SigningStargateClientWithLit } from "./stargateClientWithLit";
import { pubkeyToAddress, pubkeyToRawAddress } from "@cosmjs/amino";

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
const pkpAuthSig = {
  "sig": "0x9e750da7ca491309df16f2cc3d3c56d942a7bfaf4c9e1cfce780ca71a5ff49bd52a5de6cc6718ed45e66bd21e85445faaac7bfaf5e4b8b963c3204fabeb914711b",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "localhost:3000 wants you to sign in with your Ethereum account:\n0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070\n\n\nURI: http://localhost:3000/\nVersion: 1\nChain ID: 80001\nNonce: w0Jb4Vc5RjFxq0lbU\nIssued At: 2023-02-07T23:21:38.020Z\nExpiration Time: 2023-02-14T23:21:38.006Z",
  "address": "0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070"
}

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

function testPkpPubKeyToCosmosAddress() {
  console.log('PKP Public Key to Cosmos Address');
  console.log('Public Key is:', pkpPublicKey);
  const cosmosAddress = pkpPubKeyToCosmosAddress(pkpPublicKey);
  console.log('Cosmos Address is: ', cosmosAddress);
}

// testPkpPubKeyToCosmosAddress();

const message = {
  typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  value: {
    fromAddress: pkpAddress,
    toAddress: keplrAddress,
    amount: [{ denom: "uatom", amount: "100000" }],
  }
}

const amount = [{ denom: "uatom", amount: "100000" }]
const gasFee = {
  amount: [{ denom: "uatom", amount: "500" }],
  gas: "200000",
}
const gasLimit = 200000;

const testTx = {
  messages: [message],
  memo: '',
  timeoutHeight: 0 // to get the latest block height
}

// note: need to use `encodeAsAny` in proto-signing to encode the message
const txBodyEncodeObject: TxBodyEncodeObject = {
  typeUrl: "/cosmos.tx.v1beta1.TxBody",
  value: {
    messages: [], // messages,
    memo: '' // memo,
  },
};

// note: authInfoBytes is the encoded authInfo
// encode
const authInfoBytes = {
  signerInfos: {
  //   publicKey: '' // wallet pubkey,
  //   modeInfo: {
  //     single: {mode: signMode},
  //   },
  //   sequence: Long.fromNumber(sequence),
  // },
  // fee: {
  //   amount: [...feeAmount],
  //   gasLimit: Long.fromNumber(gasLimit),
  //   granter: feeGranter,
  //   payer: feePayer,
  // }
}}

// note: final transaction format
// code is in proto-signing: signing.ts line 62
const transactionFormatBeforeSending = {
  bodyBytes: '', // Uint8 signed.bodyBytes,
  authInfoBytes: '', // Uint8 signed.authInfoBytes,
  signatures: '' // [fromBase64(signature.signature)],
}

const unsignedTx = {
  "body": {
    "messages": [
      {
        "@type": "/cosmos.bank.v1beta1.MsgSend",
        "from_address": keplrAddress,
        "to_address": pkpAddress,
        "amount": [
          {
            "denom": "ucosm",
            "amount": "100000"
          }
        ]
      }
    ],
      "memo": "",
      "timeout_height": "0",
      "extension_options": [],
      "non_critical_extension_options": []
  },
  "auth_info": {
    "signer_infos": [],
    "fee": {
    "amount": [
      {
        "denom": "ucosm",
        "amount": "2000"
      }
    ],
      "gas_limit": "200000",
      "payer": "",
      "granter": ""
    }
  },
  "signatures": []
}


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

  console.log('Sign with Lit');
  console.log('Auth Sig is:', authSig);
  const message = 'test message';
  console.log('CHECK TO STRING', toString)
  const pkpSigner = await SigningStargateClientWithLit.createClient(pkpPublicKey, pkpAuthSig, rpc)
  console.log('Signed Tx is:', pkpSigner);
  const signedTx = await pkpSigner.sendTokens(keplrAddress, amount, gasFee);
  console.log('signedTx is:', signedTx);
  return signedTx;

}

testSignWithLit().then((res => {
  console.log('SignCosmosWithLit res:', res);
}))


// note: experiment with @cosmos-client/core

const checkPkpTokenOwnership = async () => {
  const client = await StargateClient.connect(rpc)
  // console.log('client', client)
  const pkpTokens = await client.getAllBalances(pkpAddress);
  console.log('pkpTokens', pkpTokens)
}

checkPkpTokenOwnership().then(res => {
  console.log('checkPkpTokenOwnership res:', res);
})

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

