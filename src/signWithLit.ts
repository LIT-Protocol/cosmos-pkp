import LitJsSdk from 'lit-js-sdk'
import { ethers } from "ethers";
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import { fromBase64, fromHex } from "@cosmjs/encoding";
import { hexSigToBase64Sig } from "./helpers/litHelpers";

interface SignCosmosTxWithLitParams {
  pkpPublicKey: string;
  message: any;
  authSig: any;
}

const code = `
  const sign = async () => {
    const sigShare = await LitActions.signEcdsa({ toSign, publicKey, sigName });
  };
  sign()
`

const hashMessageUsingEthers = (message: any) => {
  return ethers.utils.sha256(ethers.utils.toUtf8Bytes(message));
}

async function signCosmosTxWithLit({pkpPublicKey, message, authSig}: SignCosmosTxWithLitParams):
  Promise<any> {
  let litNodeClient;
  try {
    // @ts-ignore
    litNodeClient = new LitJsSdk.LitNodeClient({litNetwork: "serrano", debug: false});
    await litNodeClient.connect();
  } catch (err) {
    console.log('Unable to connect to network', err);
    return;
  }

  if (!litNodeClient) {
    console.log('LitNodeClient was not instantiated');
    return;
  }

  console.log('message', message)
  const hashedWithEthers = hashMessageUsingEthers(message);
  console.log('hashedWithEthers', hashedWithEthers);

  // const hashedWithCosm = sha256(message);
  // console.log('hashedWithCosm', hashedWithCosm);


  const jsParams = {
    publicKey: pkpPublicKey,
    toSign: hashedWithEthers,
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

  console.log('litActionRes', ethers.utils.verifyMessage(hashedWithEthers, litActionRes.signatures.cosmos.signature));

  return litActionRes.signatures.cosmos.signature
}

export {
  signCosmosTxWithLit,
}
