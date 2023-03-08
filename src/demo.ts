// note: bring back once logging is good
import { SigningStargateClientWithLit } from "./stargateClientWithLit";
import { DirectSecp256k1HdWallet, encodePubkey } from "@cosmjs/proto-signing";
import { SigningStargateClient, StargateClient } from "./stargate/src";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { convertCosmosPubKeyToEthAddress } from "./helpers/litHelpers";
import { toHex } from "@cosmjs/encoding";
import EthCrypto from "eth-crypto";

// rpc for theta testnet
const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

// keplr wallet data
const keplrMnemonicString = 'either control crazy lonely police foam swim replace salute snap quick harbor'
const keplrAddress = 'cosmos16a6zyjwyww6scfa44s9jekdwwjfjrpppajk9d0'
const keplrPubKey = new Uint8Array([
  2, 246,  84,  18,  18,  44, 210, 108,
  254, 182, 178, 122, 254, 228,  57, 254,
  89, 134, 104,  35, 144,  69, 137,  41,
  155, 100, 240,  40, 193, 126,  48, 195,
  130
]);

// pkp owner wallet data
const pkpOwnerPubKey = "0x04507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec8d7c893d10b65c8dd72a296084e8729dfeb13265c3d33d6b6fd6bad92616efad"
const pkpOwnerCompressedPubKey = "0x03507302fc8404fe81260ed233a2d79f209f6789948b4fb31811fe9099bd0459ec"
const pkpOwnerAddress = '0x20623933681a53D5ee48959eC1770BeA7afA4eDe'
const pkpOwnerAuthSig = {
  "sig": "0x4348d34c6b6e461b84ffbaf0b093bce8110eab3ee644ef4a73afda71ad77c0371d349cd2837e36ee7b4847c2ec0b5f7ad94781a34bf13533690c03f4f296e0d71c",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "lit-swap-playground.netlify.app wants you to sign in with your Ethereum account:\n0x20623933681a53D5ee48959eC1770BeA7afA4eDe\n\n\nURI: https://lit-swap-playground.netlify.app/\nVersion: 1\nChain ID: 137\nNonce: jPKR8TYXLgYKFNE4d\nIssued At: 2023-03-08T17:15:06.230Z\nExpiration Time: 2023-03-15T17:15:06.207Z",
  "address": "0x20623933681a53D5ee48959eC1770BeA7afA4eDe"
}

// pkp data
const pkpPublicKey = "0x0460579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952217c60c945c434dfb68bfc1e5b7cd89b41d1180bdd12b76a9f1d2f82b6d0d6db"
const pkpCompressedPublicKey = "0x0360579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952"
const pkpEthAddress = "0x7Fd02EEDaE344ecdC95b53086d537bD259c713fb"

// this pkpCosmosAddress uses the reverse engineered series of functions to derive the address (attempt #1 in litHelpers.ts)
const pkpCosmosAddress = 'cosmos1y6nj302f63xanqvmkyx8acc2cq2xsqlwmzfzup'

// this pkpCosmosAddress uses the tendermint derivation (attempt#2 in litHelpers.ts)
// const pkpCosmosAddress = 'cosmos12ptkcxku9ry5htp6wq0jw8xyln4z3ny7emgwmf'

// comment in to check token ownership of pkp and keplr accounts
// checkPkpTokenOwnership(pkpCosmosAddress).then(res => {
//   console.log('checkPkpTokenOwnership res:', res);
// })

// checkCosmosPublicKeyToEthAddress().then(res => {
//   console.log('checkCosmosPublicKeyToEthAddress res:', res);
// })

// comment in to run signing with Lit
runSigningWithLitClient().then((res => {
  console.log('SignCosmosWithLit res:', res);
}))

// comment in to run a standard cosmos transaction with the keplr wallet
// runSigningWithOriginalStargateClient().then(res => {
//   console.log('res', res)
//   return;
// })

async function checkPkpTokenOwnership(address: string) {
  const client = await StargateClient.connect(rpc)
  // console.log('client', client)
  const pkpTokens = await client.getAllBalances(address);
  console.log('pkpTokens', pkpTokens)
  const keplrTokens = await client.getAllBalances(keplrAddress);
  console.log('keplrTokens', keplrTokens)
  return {pkpTokens, keplrTokens};
}

async function checkCosmosPublicKeyToEthAddress() {
  const getSignerFromMnemonic = async () => {
    return DirectSecp256k1HdWallet.fromMnemonic((keplrMnemonicString).toString(), {
      prefix: "cosmos",
    })
  }

  const signer = await getSignerFromMnemonic();
  const accountFromSigner = (await signer.getAccounts()).find(
    (account) => account.address === keplrAddress,
  );
  if (!accountFromSigner) {
    throw new Error("Failed to retrieve account from signer");
  }
  const hexPubKey = toHex(accountFromSigner.pubkey);
  console.log('hexPubKey', hexPubKey)
  const uncompressedPubKey = `${EthCrypto.publicKey.decompress(hexPubKey)}`;
  console.log('uncompressedPubKey', uncompressedPubKey)
  const ethAddress = await convertCosmosPubKeyToEthAddress(uncompressedPubKey);
  return ethAddress;
  // return ''
}

async function runSigningWithLitClient() {
  console.log('Sign with Lit');
  const pkpSigner = await SigningStargateClientWithLit.createClient(pkpPublicKey, pkpOwnerAuthSig, rpc)
  const signedTx = await pkpSigner.sendTokens(
    keplrAddress,
    [{ denom: "uatom", amount: "100000" }],
    {
      amount: [{ denom: "uatom", amount: "10000" }],
      gas: "100000",
    });
  console.log('signedTx is:', signedTx);
  return signedTx;
}

async function runSigningWithOriginalStargateClient(){
  console.log('Sign with original client');
  const getSignerFromMnemonic = async () => {
    return DirectSecp256k1HdWallet.fromMnemonic((keplrMnemonicString).toString(), {
      prefix: "cosmos",
    })
  }

  const signer = await getSignerFromMnemonic();
  const accountInfo = (await signer.getAccounts());
  console.log("accountInfo", accountInfo);
  const signingClient = await SigningStargateClient.connectWithSigner(rpc, signer);
  console.log(
    "With signing client, chain id:",
    await signingClient.getChainId(),
    ", height:",
    await signingClient.getHeight()
  );

  try {
  const sendRes = await signingClient.sendTokens(
      keplrAddress,
      pkpCosmosAddress,
      [{ denom: "uatom", amount: "100000" }],
      {
        amount: [{ denom: "uatom", amount: "10000" }],
        gas: "100000",
      }
    );
  console.log('Transaction successful:', sendRes);
  } catch(err) {
    console.log('Transaction failed:', err);
  }

  return 'Tx ';
}
