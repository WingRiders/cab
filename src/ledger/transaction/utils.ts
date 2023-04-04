import {encode} from 'borc'
import {blake2b} from 'cardano-crypto.js'
import {uniq} from 'lodash'
import {
  Address,
  BigNumber,
  Lovelace,
  HexString,
  Hash32String,
  TokenBundle,
  ZeroLovelace,
} from '@/types/base'
import {AddrKeyHash} from '@/types/address'
import {
  TxCertificate,
  TxCertificateType,
  TxInput,
  TxOutput,
  TxWithdrawal,
  TxExUnits,
  TxDatum,
  TxRedeemer,
  TxScript,
} from '@/types/transaction'
import {estimateAdditionalCollateralSize, estimateTxSize} from './estimateSize'
import {aggregateTokenBundles} from '@/ledger/assets/tokenFormatter'
import {DATA_HASH_SIZE_IN_WORDS, POLICY_ID_SIZE} from './txConstants'
import {CborizedTxDatum} from './cbor/CborizedTxDatum'
import {ProtocolParameters} from '@/types/protocolParameters'
import {fromFraction} from '@/helpers/fromFraction'
import {bech32Encode} from '@/helpers'
import {GenericOutput} from '@/types'
import {isAlonzoProtocolParameters} from '@/helpers/protocolParameters'
import {cborizeSingleTxOutput} from './cbor/cborize'
import {TxPlanMetadata} from '@/types/txPlan'

/**
 * Computes the size required to store the included value in an UTxO.
 * The type Value represents a collection of tokens, including Ada.
 * Since Ada always needs to be included in an UTxO only the other tokens
 * have an effect on the size.
 *
 * @param multiasset list of other tokens
 * @returns size in heapwords
 */
export const computeValueSize = (multiasset: TokenBundle = []) => {
  if (multiasset.length === 0) {
    return 2
  }

  // based on Cardano.Ledger.Mary.Value representationSize
  const quot = (x: number, y: number) => Math.floor(x / y)
  const roundupBytesToWords = (x: number) => quot(x + 7, 8)

  const aggregatedTokenBundle = aggregateTokenBundles([multiasset])
  // this will get all distinct tokens (policyId + assetName)
  const distinctAssets = aggregatedTokenBundle.map(({assetName}) => assetName)

  const numAssets = distinctAssets.length
  // tokens are groupped based on policyId
  const numPIDs = uniq(aggregatedTokenBundle.map(({policyId}) => policyId)).length
  const sumAssetNameLengths = distinctAssets.reduce(
    (acc, assetName) => acc + Buffer.from(assetName, 'hex').byteLength,
    0
  )

  const policyIdSize = POLICY_ID_SIZE // pidSize in specs
  return 6 + roundupBytesToWords(numAssets * 12 + sumAssetNameLengths + numPIDs * policyIdSize)
}

const computeMinUTxOLovelaceAmountAlonzo = (
  coinsPerUtxoWord: number,
  tokenBundle: TokenBundle,
  datumHash?: Hash32String
): Lovelace => {
  const txOutLengthNoValue = 14
  const txInLength = 7
  const utxoEntrySizeWithoutValue = 6 + txOutLengthNoValue + txInLength // 27

  const utxoSize =
    utxoEntrySizeWithoutValue + computeValueSize(tokenBundle) + (datumHash ? DATA_HASH_SIZE_IN_WORDS : 0)

  const lovelaceAmount = new Lovelace(coinsPerUtxoWord).times(utxoSize) as Lovelace
  return lovelaceAmount
}

// minUTxOValue(output) =  |serialise(output)| * coinsPerUTxOByte
const computeMinUTxOLovelaceAmountBabbage = (
  coinsPerUtxoByte: number,
  address: Address,
  tokenBundle: TokenBundle,
  datumHash?: Hash32String
): Lovelace => {
  const cborOutput = encode(
    cborizeSingleTxOutput({
      isChange: false,
      address,
      coins: ZeroLovelace,
      tokenBundle,
      dataHash: datumHash,
    })
  )

  // Formal specification states this formula to calculate he min UTxO lovelace is:
  // (serSize txout + 160) ∗ coinsPerUTxOByte pp
  //
  // From https://hydra.iohk.io/build/15751178/download/1/babbage-changes.pdf:
  // In the UTXO rule, we switch from a manual estimation of the size consumed by UTxO entries
  // to an estimation using the serialization. However, since the TxIn used as a key in the UTxO map
  // is not part of the serialization, we need to account for it manually. By itself it is 40 bytes, but we
  // add another 120 bytes of overhead for the in-memory representation of Haskell data.
  //
  // This min UTxO lovelace is calculated without the size of the added coins in bytes
  // Therefore we also account for extra 4 bytes, which should be enough to include up to 2^32-1 Lovelace
  // in the output. That should be always enough.
  return new Lovelace(cborOutput.byteLength).plus(160 + 4).times(coinsPerUtxoByte) as Lovelace
}

export const computeMinUTxOLovelaceAmount = ({
  protocolParameters,
  address,
  tokenBundle,
  datumHash,
}: {
  protocolParameters: ProtocolParameters
  address: Address
  tokenBundle: TokenBundle
  datumHash?: Hash32String
}): Lovelace => {
  if (isAlonzoProtocolParameters(protocolParameters)) {
    return computeMinUTxOLovelaceAmountAlonzo(
      protocolParameters.coinsPerUtxoWord,
      tokenBundle,
      datumHash
    )
  }
  return computeMinUTxOLovelaceAmountBabbage(
    protocolParameters.coinsPerUtxoByte,
    address,
    tokenBundle,
    datumHash
  )
}

export function txFeeForBytes(txSizeInBytes: number, txFeePerByte: number) {
  return new Lovelace(txSizeInBytes).times(txFeePerByte) as Lovelace
}

function pricesToNumbers(prices: ProtocolParameters['prices']): {
  memory: BigNumber
  steps: BigNumber
} {
  if (!prices) {
    return {
      memory: new BigNumber(0),
      steps: new BigNumber(0),
    }
  }

  return {
    memory: fromFraction(prices.memory),
    steps: fromFraction(prices.steps),
  }
}

export function txFeeFunction(
  txSizeInBytes: number,
  pParams: ProtocolParameters,
  exUnits: TxExUnits[] = []
): Lovelace {
  const executionUnitPrices = pricesToNumbers(pParams.prices)
  const scriptFees = exUnits.reduce(
    (acc, exUnit) =>
      acc
        .plus(executionUnitPrices.memory.times(exUnit.memory))
        .plus(executionUnitPrices.steps.times(exUnit.steps)),
    new Lovelace(0)
  )
  return new Lovelace(pParams.minFeeConstant)
    .plus(txFeeForBytes(txSizeInBytes, pParams.minFeeCoefficient))
    .plus(scriptFees)
    .integerValue(Lovelace.ROUND_CEIL) as Lovelace
}

export function computeAdditionalCollateralFee(pParams: ProtocolParameters, initial = false): Lovelace {
  return new Lovelace(pParams.minFeeCoefficient).times(
    estimateAdditionalCollateralSize(initial)
  ) as Lovelace
}

type ComputeTxFeeParams = {
  inputs: Array<TxInput>
  collateralInputs?: Array<TxInput>
  outputs: Array<TxOutput>
  certificates?: Array<TxCertificate>
  withdrawals?: Array<TxWithdrawal>
  datums?: Array<TxDatum>
  redeemers?: Array<TxRedeemer>
  scripts?: Array<TxScript>
  mint?: TokenBundle
  requiredSigners?: Array<AddrKeyHash>
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata
}

export function computeRequiredTxFee({
  inputs,
  collateralInputs = [],
  outputs,
  certificates = [],
  withdrawals = [],
  datums = [],
  redeemers = [],
  scripts = [],
  mint = [],
  requiredSigners = [],
  protocolParameters,
  metadata = undefined,
}: ComputeTxFeeParams): Lovelace {
  const fee = txFeeFunction(
    estimateTxSize({
      inputs,
      outputs,
      certificates,
      withdrawals,
      datums,
      redeemers,
      collateralInputs,
      scripts,
      mint,
      requiredSigners,
      metadata,
    }),
    protocolParameters,
    redeemers.map((redeemer) => redeemer.exUnits)
  )
  return fee
}

export function computeRequiredDeposit(
  certificates: Array<TxCertificate>,
  protocolParameters: ProtocolParameters
): Lovelace {
  // TODO: this to network config
  const CertificateDeposit: {[key in TxCertificateType]: number} = {
    [TxCertificateType.DELEGATION]: 0,
    [TxCertificateType.STAKEPOOL_REGISTRATION]: protocolParameters.poolDeposit,
    [TxCertificateType.STAKING_KEY_REGISTRATION]: protocolParameters.stakeKeyDeposit,
    [TxCertificateType.STAKING_KEY_DEREGISTRATION]: -protocolParameters.stakeKeyDeposit,
  }
  return certificates.reduce(
    (acc, {type}) => acc.plus(CertificateDeposit[type]),
    new Lovelace(0)
  ) as Lovelace
}

export const createTokenChangeOutputs = ({
  changeAddress,
  changeTokenBundle,
  maxOutputTokens,
  protocolParameters,
}: {
  changeAddress: Address
  changeTokenBundle: TokenBundle
  maxOutputTokens: number
  protocolParameters: ProtocolParameters
}): TxOutput[] => {
  const nOutputs = Math.ceil(changeTokenBundle.length / maxOutputTokens)
  const outputs: TxOutput[] = []
  for (let i = 0; i < nOutputs; i++) {
    const tokenBundle = changeTokenBundle.slice(i * maxOutputTokens, (i + 1) * maxOutputTokens)
    outputs.push({
      isChange: true,
      address: changeAddress,
      coins: computeMinUTxOLovelaceAmount({protocolParameters, address: changeAddress, tokenBundle}),
      tokenBundle,
    })
  }
  return outputs
}

export const hashDatum = (datum: TxDatum): HexString => hashSerialized(new CborizedTxDatum(datum))

export const getDatumFingerprint = (datum: TxDatum) =>
  bech32Encode('datum', Buffer.from(hashDatum(datum), 'hex'))

export const createEmptyChangePlaceholder = ({
  changeAddress,
}: {
  changeAddress: Address
}): GenericOutput => ({
  isChangePlaceholder: true,
  address: changeAddress,
  coins: ZeroLovelace,
  tokenBundle: [],
})

export function hashSerialized(data: any): string {
  return blake2b(encode(data), 32).toString('hex')
}
