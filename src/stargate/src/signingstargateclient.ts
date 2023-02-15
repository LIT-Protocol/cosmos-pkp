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
} from "../../proto-signing/src/index";
import { HttpEndpoint, Tendermint34Client } from "@cosmjs/tendermint-rpc";
import { assert, assertDefined } from "@cosmjs/utils";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { MsgWithdrawDelegatorReward } from "cosmjs-types/cosmos/distribution/v1beta1/tx";
import { MsgDelegate, MsgUndelegate } from "cosmjs-types/cosmos/staking/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgTransfer } from "cosmjs-types/ibc/applications/transfer/v1/tx";
import { Height } from "cosmjs-types/ibc/core/client/v1/client";
// @ts-ignore
import Long from "long";

import { AminoConverters, AminoTypes } from "./aminotypes";
import { calculateFee, GasPrice } from "./fee";
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
} from "./modules";
import {
  createAuthzAminoConverters,
  createBankAminoConverters,
  createDistributionAminoConverters,
  createFeegrantAminoConverters,
  createGovAminoConverters,
  createIbcAminoConverters,
  createStakingAminoConverters,
  createVestingAminoConverters,
} from "./modules";
import { DeliverTxResponse, StargateClient, StargateClientOptions } from "./stargateclient";
import LitJsSdk from "lit-js-sdk";
import { makeLogReadableInTerminal } from "../../helpers/litHelpers";
import { Secp256k1 } from "@cosmjs/crypto";
import { publicKey } from "eth-crypto";

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

export class SigningStargateClient extends StargateClient {
  public readonly registry: Registry;
  public readonly broadcastTimeoutMs: number | undefined;
  public readonly broadcastPollIntervalMs: number | undefined;

  private readonly signer: OfflineSigner;
  private readonly aminoTypes: AminoTypes;
  private readonly gasPrice: GasPrice | undefined;

  public static async connectWithSigner(
    endpoint: string | HttpEndpoint,
    signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<SigningStargateClient> {
    const tmClient = await Tendermint34Client.connect(endpoint);
    return new SigningStargateClient(tmClient, signer, options);
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
  public static async offline(
    signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<SigningStargateClient> {
    return new SigningStargateClient(undefined, signer, options);
  }

  protected constructor(
    tmClient: Tendermint34Client | undefined,
    signer: OfflineSigner,
    options: SigningStargateClientOptions,
  ) {
    super(tmClient, options);
    const { registry = createDefaultRegistry(), aminoTypes = new AminoTypes(createDefaultTypes()) } = options;
    this.registry = registry;
    this.aminoTypes = aminoTypes;
    this.signer = signer;
    this.broadcastTimeoutMs = options.broadcastTimeoutMs;
    this.broadcastPollIntervalMs = options.broadcastPollIntervalMs;
    this.gasPrice = options.gasPrice;
  }

  public async simulate(
    signerAddress: string,
    messages: readonly EncodeObject[],
    memo: string | undefined,
  ): Promise<number> {
    console.log('##### -> start of simulate')
    console.log('simulate - signerAddress', signerAddress);
    console.log('simulate - messages', messages);
    const anyMsgs = messages.map((m) => this.registry.encodeAsAny(m));
    console.log('simulate - anyMsgs', anyMsgs);
    const accountFromSigner = (await this.signer.getAccounts()).find(
      (account) => account.address === signerAddress,
    );
    console.log('accountFromSigner', accountFromSigner);
    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }
    const pubkey = encodeSecp256k1Pubkey(accountFromSigner.pubkey);
    const { sequence } = await this.getSequence(signerAddress);
    const { gasInfo } = await this.forceGetQueryClient().tx.simulate(anyMsgs, memo, pubkey, sequence);
    assertDefined(gasInfo);
    return Uint53.fromString(gasInfo.gasUsed.toString()).toNumber();
  }

  public async sendTokens(
    senderAddress: string,
    recipientAddress: string,
    amount: readonly Coin[],
    fee: StdFee | "auto" | number,
    memo = "",
  // ): Promise<DeliverTxResponse> {
  ): Promise<void> {
    console.log('##### -> start of sendTokens')
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
    fee: StdFee | "auto" | number,
    memo = "",
  // ): Promise<DeliverTxResponse> {
  ): Promise<any> {
    console.log('##### -> start of signAndBroadcast')
    let usedFee: StdFee;
    console.log('signAndBroadcast - fee', fee)
    if (fee == "auto" || typeof fee === "number") {
      assertDefined(this.gasPrice, "Gas price must be set in the client options when auto gas is used.");
      const gasEstimation = await this.simulate(signerAddress, messages, memo);
      console.log('gasEstimation', gasEstimation);
      const multiplier = typeof fee === "number" ? fee : 1.3;
      usedFee = calculateFee(Math.round(gasEstimation * multiplier), this.gasPrice);
    } else {
      console.log('fee is declared')
      usedFee = fee;
    }
    const txRaw = await this.sign(signerAddress, messages, usedFee, memo);
    console.log('signAndBroadcast - txRaw', txRaw)
    const txBytes = TxRaw.encode(txRaw).finish();
    console.log('signAndBroadcast - txBytes', txBytes)
    // return this.broadcastTx(txBytes, this.broadcastTimeoutMs, this.broadcastPollIntervalMs);
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

    return this.signDirect(signerAddress, messages, fee, memo, signerData)
    // await this.signDirect(signerAddress, messages, fee, memo, signerData)
  }

  private async signDirect(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    { accountNumber, sequence, chainId }: SignerData,
  // ): Promise<TxRaw> {
  ): Promise<any> {
    console.log('##### -> start of signDirect')
    console.log('signDirect - signerAddress', signerAddress)
    console.log('signDirect - messages', messages)
    console.log('signDirect - fee', fee)
    assert(isOfflineDirectSigner(this.signer));
    const accountFromSigner = (await this.signer.getAccounts()).find(
      (account) => account.address === signerAddress,
    );
    console.log('signDirect - accountFromSigner', accountFromSigner)

    if (!accountFromSigner) {
      throw new Error("Failed to retrieve account from signer");
    }
    console.log('========> pubkey', accountFromSigner.pubkey)
    const encodedPubKey = encodePubkey(encodeSecp256k1Pubkey(accountFromSigner.pubkey));
    const txBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: messages,
        memo: memo,
      },
    };
    console.log('signDirect - txBodyEncodeObject', makeLogReadableInTerminal(txBodyEncodeObject))
    const txBodyBytes = this.registry.encode(txBodyEncodeObject);
    console.log('signDirect - txBodyBytes', makeLogReadableInTerminal(txBodyBytes))
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    console.log('encodedPubKey', encodedPubKey)
    console.log('sinerData', sequence)
    console.log('fee.amount', fee.amount)
    console.log('gasLimit', gasLimit)
    console.log('fee.payer', fee.payer)
    console.log('fee.granter', fee.granter)
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey: encodedPubKey, sequence }],
      fee.amount,
      gasLimit,
      fee.granter,
      fee.payer,
    );
    console.log('authInfoBytes', makeLogReadableInTerminal(authInfoBytes))
    console.log('chainId', chainId)
    console.log('accountNumber', accountNumber)
    const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
    console.log('signDirect - signDoc', makeLogReadableInTerminal(signDoc))
    console.log('signDirect - signerAddress', makeLogReadableInTerminal(signerAddress))
    const { signature, signed } = await this.signer.signDirect(signerAddress, signDoc);
    console.log("signDirect - signature.signature", signature.signature.length)
    console.log("signDirect - signed", signed)
    // const txRawObj = {
    //   bodyBytes: signed.bodyBytes,
    //   authInfoBytes: signed.authInfoBytes,
    //   signatures: [fromBase64(signature.signature)],
    // }
    // console.log('txRawObj', txRawObj)
    // const txRawFromPartial = TxRaw.fromPartial(txRawObj);
    // console.log('txRawFromPartial', txRawFromPartial)
    // return txRawFromPartial
  }

}
