import LitJsSdk from 'lit-js-sdk'
import { ethers } from "ethers";
import { sha256 } from "@ethersproject/sha2";
import { Secp256k1 } from "@cosmjs/crypto";
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

// const code = `
//   const sign = async () => {
//     const sigShare = await LitActions.ethPersonalSignMessageEcdsa({ toSign, publicKey, sigName });
//   };
//   sign()
// `

const hashMessageUsingEthers = (message: any) => {
  return sha256(ethers.utils.toUtf8Bytes(message));
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

  const hashedWithCosm = sha256(ethers.utils.toUtf8Bytes(message));
  const buffer = Buffer.from(hashedWithCosm.slice(2), 'hex');
  const hashedArray = new Uint8Array(buffer);

  const jsParams = {
    publicKey: pkpPublicKey,
    toSign: hashedArray,
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

  console.log("things", {
    pkpPublicKey,
    hashedWithCosm,
    sig: litActionRes.signatures.cosmos.signature,
  });
  console.log('litActionRes', ethers.utils.recoverPublicKey(hashedWithCosm, litActionRes.signatures.cosmos.signature));

  return litActionRes.signatures.cosmos.signature
}

export {
  signCosmosTxWithLit,
}
