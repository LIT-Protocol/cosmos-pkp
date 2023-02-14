import LitJsSdk from 'lit-js-sdk'
import { compressPublicKey } from "./helpers/litHelpers";
import { ethers } from "ethers";
import { hash } from "eth-crypto";

interface SignCosmosTxWithLitParams {
  pkpPublicKey: string;
  uint8PubKey: Uint8Array;
  message: any;
  authSig: any;
}

const code = `
  const sign = async () => {
    const sigShare = await LitActions.signEcdsa({ toSign, publicKey, sigName });
  };
  sign()
`

const hashMessage = (message: any) => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
}

async function signCosmosTxWithLit({pkpPublicKey, uint8PubKey, message, authSig}: SignCosmosTxWithLitParams):
  Promise<any> {
  let litNodeClient;
  try {
    console.log("Connecting to Lit Node");
    // @ts-ignore
    litNodeClient = new LitJsSdk.LitNodeClient({litNetwork: "serrano", debug: false});
    console.log('before connect')
    await litNodeClient.connect();
  } catch (err) {
    console.log('Unable to connect to network', err);
    return;
  }
  console.log("litNodeClient connected")

  if (!litNodeClient) {
    console.log('LitNodeClient was not instantiated');
    return;
  }

  const hashedRes = hashMessage(message);
  console.log('hashedRes', hashedRes);
  const jsParams = {
    publicKey: pkpPublicKey,
    toSign: hashedRes,
    sigName: 'cosmos',
  }

  let litActionRes;
  try {
    litActionRes = await litNodeClient.executeJs({
      code: code,
      authSig,
      jsParams: jsParams,
    });
  } catch (err) {
    console.log('Unable to execute code', err);
    return;
  }

  console.log('litActionRes', litActionRes);
  console.log('!!!!!!!!!!!! check sig', ethers.utils.verifyMessage(hashedRes, litActionRes.signatures.cosmos.signature))

  // return litActionRes;
  return {
    pub_key: {
      type: 'tendermint/PubKeySecp256k1',
      value: uint8PubKey
    },
    signature: litActionRes.signatures.cosmos.signature
  }
}

export {
  signCosmosTxWithLit,
}
