import { encodeSecp256k1Pubkey, makeSignDoc as makeSignDocAmino, StdFee } from "@cosmjs/amino";
import { fromBase64, toBase64 } from "@cosmjs/encoding";
import { Int53, Uint53 } from "@cosmjs/math";
import {
  EncodeObject,
  encodePubkey,
  GeneratedType,
  isOfflineDirectSigner,
  makeAuthInfoBytes,
  makeSignDoc,
  OfflineSigner,
  Registry,
  TxBodyEncodeObject,
  // @ts-ignore
} from "./proto-signing/src";
import { HttpEndpoint, Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
// @ts-ignore
import Long from "long";
import { AminoConverters, AminoTypes } from "./stargate/src/aminotypes";
import { calculateFee, GasPrice } from "./stargate/src/fee";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  authzTypes,
  bankTypes,
  distributionTypes,
  feegrantTypes,
  govTypes,
  ibcTypes,
  MsgDelegateEncodeObject,
  MsgSendEncodeObject,
  MsgTransferEncodeObject,
  MsgUndelegateEncodeObject,
  MsgWithdrawDelegatorRewardEncodeObject,
  stakingTypes,
  vestingTypes,
} from "./stargate/src/modules";
import {
  createAuthzAminoConverters,
  createBankAminoConverters,
  createDistributionAminoConverters,
  createFeegrantAminoConverters,
  createGovAminoConverters,
  createIbcAminoConverters,
  createStakingAminoConverters,
  createVestingAminoConverters,
} from "./stargate/src/modules";
import { DeliverTxResponse, StargateClient, StargateClientOptions } from "./stargate/src/stargateclient";
import {
  compressPublicKey, hexSigToBase64Sig,
  hexToBase64, makeLogReadableInTerminal,
  pkpPubKeyToCosmosAddress
} from "./helpers/litHelpers";
import { signCosmosTxWithLit } from "./signWithLit";
import { ethers } from "ethers";
// import Uint8Array from "uint8arrays";

export const defaultRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
  ["/cosmos.base.v1beta1.Coin", Coin],
  ...authzTypes,
  ...bankTypes,
  ...distributionTypes,
  ...feegrantTypes,
  ...govTypes,
  ...stakingTypes,
  ...ibcTypes,
  ...vestingTypes,
];

function createDefaultRegistry(): Registry {
  return new Registry(defaultRegistryTypes);
}

/**
 * Signing information for a single signer that is not included in the transaction.
 *
 * @see https://github.com/cosmos/cosmos-sdk/blob/v0.42.2/x/auth/signing/sign_mode_handler.go#L23-L37
 */
export interface SignerData {
  readonly accountNumber: number;
  readonly sequence: number;
  readonly chainId: string;
}

/** Use for testing only */
export interface PrivateSigningStargateClient {
  readonly registry: Registry;
}

export interface SigningStargateClientOptions extends StargateClientOptions {
  readonly registry?: Registry;
  readonly aminoTypes?: AminoTypes;
  readonly broadcastTimeoutMs?: number;
  readonly broadcastPollIntervalMs?: number;
  readonly gasPrice?: GasPrice;
}

export interface AuthSig {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
}

function createDefaultTypes(): AminoConverters {
  return {
    ...createAuthzAminoConverters(),
    ...createBankAminoConverters(),
    ...createDistributionAminoConverters(),
    ...createGovAminoConverters(),
    ...createStakingAminoConverters(),
    ...createIbcAminoConverters(),
    ...createFeegrantAminoConverters(),
    ...createVestingAminoConverters(),
  };
}

export class SigningStargateClientWithLit extends StargateClient {
  public readonly registry: Registry;
  public readonly broadcastTimeoutMs: number | undefined;
  public readonly broadcastPollIntervalMs: number | undefined;

  private readonly pkpPublicKey: string;
  private readonly compressedPublicKey: string;
  private readonly authSig: AuthSig;
  private readonly aminoTypes: AminoTypes;
  private readonly gasPrice: GasPrice | undefined;

  public static async createClient(
    pkpPublicKey: string,
    authSig: AuthSig,
    endpoint: string | HttpEndpoint,
    // signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<SigningStargateClientWithLit> {
    const tmClient = await Tendermint34Client.connect(endpoint);
    return new SigningStargateClientWithLit(pkpPublicKey, authSig, tmClient, options);
  }

  /**
   * Creates a client in offline mode.
   *
   * This should only be used in niche cases where you know exactly what you're doing,
   * e.g. when building an offline signing application.
   *
   * When you try to use online functionality with such a signer, an
   * exception will be raised.
   */
  // public static async offline(
  //   signer: OfflineSigner,
  //   options: SigningStargateClientOptions = {},
  // ): Promise<SigningStargateClientWithLit> {
  //   return new SigningStargateClientWithLit(undefined, signer, options);
  // }

  protected constructor(
      pkpPublicKey: string,
      authSig: AuthSig,
      tmClient: Tendermint34Client | undefined,
      options: SigningStargateClientOptions,

  ) {
    super(tmClient, options);
    const { registry = createDefaultRegistry(), aminoTypes = new AminoTypes(createDefaultTypes()) } = options;
    this.registry = registry;
    this.aminoTypes = aminoTypes;
    this.pkpPublicKey = pkpPublicKey;
    this.authSig = authSig;
    this.compressedPublicKey = compressPublicKey(pkpPublicKey);
    this.broadcastTimeoutMs = options.broadcastTimeoutMs;
    this.broadcastPollIntervalMs = options.broadcastPollIntervalMs;
    this.gasPrice = options.gasPrice;
  }

  // public async simulate(
  //   signerAddress: string,
  //   messages: readonly EncodeObject[],
  //   memo: string | undefined,
  // ): Promise<number> {
  //   console.log('##### -> start of simulate')
  //   console.log('simulate - signerAddress', signerAddress);
  //   console.log('simulate - messages', messages);
  //   const anyMsgs = messages.map((m) => this.registry.encodeAsAny(m));
  //   console.log('simulate - anyMsgs', anyMsgs);
  //   const base64PubKey = hexToBase64(this.compressedPublicKey);
  //   const uint8ArrayPubKey = base64ToUint8Array(base64PubKey);
  //   const pubkey = encodeSecp256k1Pubkey(uint8ArrayPubKey);
  //   const { sequence } = await this.getSequence(signerAddress);
  //   const { gasInfo } = await this.forceGetQueryClient().tx.simulate(anyMsgs, memo, pubkey, sequence);
  //   // @ts-ignore
  //   return Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
  // }

  public async sendTokens(
    recipientAddress: string,
    amount: readonly Coin[],
    fee: StdFee,
    memo = "",
    // ): Promise<DeliverTxResponse> {
  ): Promise<void> {
    const senderAddress = pkpPubKeyToCosmosAddress(this.pkpPublicKey);
    console.log('##### -> start of sendTokens - senderAddress', senderAddress)
    // creates message for transaction
    const sendMsg: MsgSendEncodeObject = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        fromAddress: senderAddress,
        toAddress: recipientAddress,
        amount: [...amount],
      },
    };

    console.log('sendTokens - sendMsg', makeLogReadableInTerminal(sendMsg));
    // return this.signAndBroadcast(senderAddress, [sendMsg], fee, memo);
    await this.signAndBroadcast(senderAddress, [sendMsg], fee, memo);
  }

  public async signAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee | any,
    memo = "",
    // ): Promise<DeliverTxResponse> {
  ): Promise<any> {
    console.log('##### -> start of signAndBroadcast')
    let usedFee: StdFee = fee
    console.log('signAndBroadcast - fee', fee)
    // if (fee == "auto" || typeof fee === "number") {
    //   const gasEstimation = await this.simulate(signerAddress, messages, memo);
    //   console.log('gasEstimation', gasEstimation);
    //   const multiplier = typeof fee === "number" ? fee : 1.3;
    //   usedFee = calculateFee(Math.round(gasEstimation * multiplier), this.gasPrice);
    // } else {
      console.log('fee is declared')
      usedFee = fee;
    // }
    const txRaw = await this.sign(signerAddress, messages, usedFee, memo);
    console.log('signAndBroadcast - txRaw', txRaw)
    const txBytes = TxRaw.encode(txRaw).finish();
    console.log('signAndBroadcast - txBytes', txBytes)
    // return this.broadcastTx(txBytes, this.broadcastTimeoutMs, this.broadcastPollIntervalMs);
    return this.broadcastTx(txBytes);
  }

  /**
   * Gets account number and sequence from the API, creates a sign doc,
   * creates a single signature and assembles the signed transaction.
   *
   * The sign mode (SIGN_MODE_DIRECT or SIGN_MODE_LEGACY_AMINO_JSON) is determined by this client's signer.
   *
   * You can pass signer data (account number, sequence and chain ID) explicitly instead of querying them
   * from the chain. This is needed when signing for a multisig account, but it also allows for offline signing
   * (See the SigningStargateClient.offline constructor).
   */
  public async sign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    explicitSignerData?: SignerData,
  // ): Promise<TxRaw> {
  ): Promise<any> {
    console.log('##### -> start of sign')
    let signerData: SignerData;
    if (explicitSignerData) {
      signerData = explicitSignerData;
    } else {
      const { accountNumber, sequence } = await this.getSequence(signerAddress);
      console.log('sign - accountNumber', accountNumber)
      console.log('sign - sequence', sequence)
      const chainId = await this.getChainId();
      console.log('sign - chainId', chainId)
      signerData = {
        accountNumber: accountNumber,
        sequence: sequence,
        chainId: chainId,
      };
      console.log('sign - signerData', signerData)
    }

    return this.signWithLit(signerAddress, messages, fee, memo, signerData)
    // await this.signWithLit(signerAddress, messages, fee, memo, signerData)
  }

  private async signWithLit(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    { accountNumber, sequence, chainId }: SignerData,
  // ): Promise<TxRaw> {
  ): Promise<any> {
    console.log('##### -> start of signWithLit')
    console.log('signWithLit - signerAddress', signerAddress)
    console.log('signWithLit - messages', messages)
    console.log('signWithLit - fee', fee)

    console.log('signDirect - this.compressedPublicKey', this.compressedPublicKey)
    const uint8PubKey: any = new Uint8Array(Buffer.from(this.compressedPublicKey, 'hex'))
    console.log('uint8PubKey', uint8PubKey)
    const txBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: messages,
        memo: memo,
      },
    };
    // console.log('signDirect - txBodyEncodeObject', makeLogReadableInTerminal(txBodyEncodeObject))
    const txBodyBytes = this.registry.encode(txBodyEncodeObject);
    // console.log('signDirect - txBodyBytes', makeLogReadableInTerminal(txBodyBytes))
    console.log('signDirect - sequence', sequence)
    console.log('signDirect - txBodyBytes', txBodyBytes)
    console.log('signDirect - fee', fee)
    // console.log('signDirect - gasLimit', gasLimit)
    console.log('========> pubkey', uint8PubKey)
    const encodedPubKey = encodePubkey(encodeSecp256k1Pubkey(uint8PubKey))
    console.log('signDirect - encodedPubKey', encodedPubKey)

    const gasLimit = Int53.fromString(fee.gas).toNumber();

    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey: encodedPubKey, sequence }],
      fee.amount,
      gasLimit,
      fee.granter,
      fee.payer,
    );
    // console.log('authInfoBytes', makeLogReadableInTerminal(authInfoBytes))
    console.log('chainId', chainId)
    console.log('accountNumber', accountNumber)
    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
    console.log('signDoc', signDoc)

    const signerObj = {
      pkpPublicKey: this.pkpPublicKey,
      message: signDoc,
      authSig: this.authSig
    }
    const signature = await signCosmosTxWithLit(signerObj);
    // console.log("signWithLit - signature", signature);
    // console.log("signWithLit - signDoc", signDoc);
    // const base64Sig = hexSigToBase64Sig(signature);
    // console.log('base64Sig', base64Sig.length);
    // const txRawObj = {
    //   bodyBytes: signDoc.bodyBytes,
    //   authInfoBytes: signDoc.authInfoBytes,
    //   signatures: [fromBase64(base64Sig)],
    // }
    // console.log('txRawObj', txRawObj)
    // const txRawFromPartial = TxRaw.fromPartial(txRawObj);
    // console.log('txRawFromPartial', txRawFromPartial)
    // return txRawFromPartial
  }
}
