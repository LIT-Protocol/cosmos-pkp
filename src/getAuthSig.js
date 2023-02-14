import LitJsSdk from "lit-js-sdk";

async function getAuthSig(chain = 'ethereum') {
  return await LitJsSdk.checkAndSignAuthMessage({chain: chain, switchChain: false});
}

export {
  getAuthSig,
}