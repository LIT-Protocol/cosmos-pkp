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

  // console.log('message', message)
  // const hashedWithEthers = hashMessageUsingEthers(message);
  // console.log('hashedWithEthers', hashedWithEthers);

  // const uint8ArrayFromMessage = Uint8Array.from(message);
  // const hashedWithCosm = sha256(ethers.utils.toUtf8Bytes(message));
  // console.log('hashedWithCosm', hashedWithCosm);
  //
  // const stubMessage = 'stub message'
  // const hashedWithCosmStub = sha256(ethers.utils.toUtf8Bytes(stubMessage));
  // const buffer = Buffer.from(hashedWithCosmStub.slice(2), 'hex');
  // const hashedStubArray = new Uint8Array(buffer);
  // console.log('hashedWithCosmStub', hashedWithCosmStub);
  // const pkpPublicKeyStub = "0x0460579cb0d4bb4846ba43a001e7ec6c42e4db62f3b9c40358df31392e90b24952217c60c945c434dfb68bfc1e5b7cd89b41d1180bdd12b76a9f1d2f82b6d0d6db"

  const hashedWithCosm = sha256(ethers.utils.toUtf8Bytes(message));
  console.log('hashedWithCosm', hashedWithCosm);
  const buffer = Buffer.from(hashedWithCosm.slice(2), 'hex');
  const hashedArray = new Uint8Array(buffer);

  const jsParams = {
    publicKey: pkpPublicKey,
    toSign: hashedArray,
    // toSign: hashedWithCosm,
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

  // const arrayifiedMessage = ethers.utils.arrayify(message);

  console.log('litActionRes', ethers.utils.recoverPublicKey(hashedWithCosm, litActionRes.signatures.cosmos.signature));

  return litActionRes.signatures.cosmos.signature
}

export {
  signCosmosTxWithLit,
}
