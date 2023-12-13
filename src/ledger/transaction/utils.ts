import {encode} from 'borc'
import {blake2b} from 'cardano-crypto.js'
import {uniq} from 'lodash'

import {bech32Encode} from '@/helpers'
import {fromFraction} from '@/helpers/fromFraction'
import {aggregateTokenBundles} from '@/ledger/assets/tokenFormatter'
import {GenericOutput, TxPlan} from '@/types'
import {AddrKeyHash} from '@/types/address'
import {Address, BigNumber, HexString, Lovelace, TokenBundle, ZeroLovelace} from '@/types/base'
import {ProtocolParameters} from '@/types/protocolParameters'
import {
  TxCertificate,
  TxCertificateType,
  TxDatum,
  TxExUnits,
  TxInput,
  TxInputRef,
  TxOutput,
  TxOutputType,
  TxRedeemer,
  TxScriptSource,
  TxWithdrawal,
} from '@/types/transaction'
import {TxPlanMetadata} from '@/types/txPlan'

import {cborizeSingleTxOutput} from './cbor/cborize'
import {CborizedTxDatum} from './cbor/CborizedTxDatum'
import {estimateAdditionalCollateralSize, estimateTxSize} from './estimateSize'
import {POLICY_ID_SIZE} from './txConstants'

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

// minUTxOValue(output) =  |serialise(output)| * coinsPerUTxOByte
export function computeMinUTxOLovelaceAmount({
  protocolParameters,
  output,
}: {
  protocolParameters: ProtocolParameters
  output: TxOutput
}): Lovelace {
  const cborOutput = encode(cborizeSingleTxOutput(output))

  // Formal specification states this formula to calculate he min UTxO lovelace is:
  // (serSize txout + 160) ∗ coinsPerUTxOByte pp
  //
  // From https://cips.cardano.org/cips/cip55/#thenewminimumlovelacecalculation:
  // In the Babbage era, unspent transaction outputs will be required to contain at least
  // (160 + |serialized_output|) * coinsPerUTxOByte
  // many lovelace. The constant overhead of 160 bytes accounts for the transaction input
  // and the entry in the UTxO map data structure (20 words * 8 bytes).
  const calculatedCoins = new Lovelace(cborOutput.byteLength)
    .plus(160)
    .times(protocolParameters.coinsPerUtxoByte) as Lovelace
  if (calculatedCoins.gt(output.coins)) {
    // If output.coins changes, the CBOR length of TxOutput also changes, so we need to recalculate the coins needed.
    // The recursion will end at the moment cborOutput.byteLength won't increase
    // and that will eventually always happen, because every time calculatedCoins increases,
    // the next increase is smaller (roughly base-2 logarithm of the previous increase).
    return computeMinUTxOLovelaceAmount({
      protocolParameters,
      output: {
        ...output,
        coins: calculatedCoins,
      },
    })
  }
  return calculatedCoins
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
  referenceInputs?: Array<TxInputRef>
  collateralInputs?: Array<TxInput>
  outputs: Array<TxOutput>
  certificates?: Array<TxCertificate>
  withdrawals?: Array<TxWithdrawal>
  datums?: Array<TxDatum>
  redeemers?: Array<TxRedeemer>
  scripts?: Array<TxScriptSource>
  mint?: TokenBundle
  requiredSigners?: Array<AddrKeyHash>
  protocolParameters: ProtocolParameters
  metadata?: TxPlanMetadata
}

export function computeRequiredTxFee({
  inputs,
  referenceInputs = [],
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
      referenceInputs,
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
    const output = {
      type: TxOutputType.LEGACY,
      isChange: true,
      address: changeAddress,
      coins: ZeroLovelace,
      tokenBundle,
    }
    outputs.push({
      ...output,
      coins: computeMinUTxOLovelaceAmount({protocolParameters, output}),
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

// Collateral is needed when script is in inputs or reference inputs.
// txPlan.scripts contains both.
export const requiresCollateral = (txPlan: TxPlan) => !!txPlan.scripts?.length
