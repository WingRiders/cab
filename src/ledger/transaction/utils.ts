import {ExecutionUnits} from '@cardano-ogmios/schema'
import {encode} from 'borc'
import {sum, uniq} from 'lodash'

import {bech32Encode} from '@/helpers/bech32'
import {blake2b} from '@/helpers/blake2b'
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

// minUTxOValue(output) =  |serialise(output)| * minUtxoDepositCoefficient
export function computeMinUTxOLovelaceAmount({
  minUtxoDepositCoefficient,
  output,
}: {
  minUtxoDepositCoefficient: number
  output: TxOutput
}): Lovelace {
  const cborOutput = encode(cborizeSingleTxOutput(output))

  // Formal specification states this formula to calculate he min UTxO lovelace is:
  // (serSize txout + 160) ∗ minUtxoDepositCoefficient pp
  //
  // From https://cips.cardano.org/cips/cip55/#thenewminimumlovelacecalculation:
  // In the Babbage era, unspent transaction outputs will be required to contain at least
  // (160 + |serialized_output|) * minUtxoDepositCoefficient
  // many lovelace. The constant overhead of 160 bytes accounts for the transaction input
  // and the entry in the UTxO map data structure (20 words * 8 bytes).
  const calculatedCoins = new Lovelace(cborOutput.byteLength)
    .plus(160)
    .times(minUtxoDepositCoefficient) as Lovelace
  if (calculatedCoins.gt(output.coins)) {
    // If output.coins changes, the CBOR length of TxOutput also changes, so we need to recalculate the coins needed.
    // The recursion will end at the moment cborOutput.byteLength won't increase
    // and that will eventually always happen, because every time calculatedCoins increases,
    // the next increase is smaller (roughly base-2 logarithm of the previous increase).
    return computeMinUTxOLovelaceAmount({
      minUtxoDepositCoefficient,
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

function pricesToNumbers(prices: ProtocolParameters['scriptExecutionPrices']): {
  memory: BigNumber
  cpu: BigNumber
} {
  return {
    memory: fromFraction(prices.memory),
    cpu: fromFraction(prices.cpu),
  }
}

export const computeFeeForRefScripts = (
  refScriptsSizeInBytes: number,
  params: ProtocolParameters['minFeeReferenceScripts']
) => {
  if (params == null) return 0 // We are not in Conway era
  const sizeRange = Math.floor(refScriptsSizeInBytes / params.range)

  // We need BigNumbers, because Math.pow(1.2, 7) = 3.583180799999 instead of 3.5831808
  const feeForPreviousRanges =
    sizeRange === 0
      ? new BigNumber(0)
      : new BigNumber(params.range)
          .times(
            BigNumber.sum(
              ...[...Array(sizeRange).keys()].map((i) =>
                new BigNumber(params.multiplier).pow(i).times(params.base)
              )
            )
          )
          .integerValue(BigNumber.ROUND_FLOOR)
  const partInTheLastRange = refScriptsSizeInBytes % params.range
  const feeForLastRange = new BigNumber(params.multiplier)
    .pow(sizeRange)
    .times(params.base)
    .times(partInTheLastRange)
    .integerValue(BigNumber.ROUND_FLOOR)
  return feeForPreviousRanges.plus(feeForLastRange).toNumber()
}

export function txFeeFunction(
  txSizeInBytes: number,
  refScriptsSizeInBytes: number,
  pParams: Pick<
    ProtocolParameters,
    'scriptExecutionPrices' | 'minFeeCoefficient' | 'minFeeConstant' | 'minFeeReferenceScripts'
  >,
  exUnits: ExecutionUnits[] = []
): Lovelace {
  const executionUnitPrices = pricesToNumbers(pParams.scriptExecutionPrices)
  const scriptFees = exUnits.reduce(
    (acc, exUnit) =>
      acc
        .plus(executionUnitPrices.memory.times(exUnit.memory))
        .plus(executionUnitPrices.cpu.times(exUnit.cpu)),
    new Lovelace(0)
  )
  const refScriptFees =
    pParams.minFeeReferenceScripts != null
      ? computeFeeForRefScripts(refScriptsSizeInBytes, pParams.minFeeReferenceScripts)
      : 0
  return new Lovelace(`${pParams.minFeeConstant.ada.lovelace}`)
    .plus(txFeeForBytes(txSizeInBytes, pParams.minFeeCoefficient))
    .plus(scriptFees)
    .plus(refScriptFees)
    .integerValue(Lovelace.ROUND_CEIL) as Lovelace
}

export function computeAdditionalCollateralFee(minFeeCoefficient: number, initial = false): Lovelace {
  return new Lovelace(minFeeCoefficient).times(estimateAdditionalCollateralSize(initial)) as Lovelace
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
  protocolParameters: Pick<
    ProtocolParameters,
    | 'minUtxoDepositCoefficient'
    | 'collateralPercentage'
    | 'stakeCredentialDeposit'
    | 'scriptExecutionPrices'
    | 'minFeeCoefficient'
    | 'minFeeConstant'
    | 'minFeeReferenceScripts'
  >
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
    sum([
      ...scripts.map((script) => (script.isReferenceScript ? script.scriptSize : 0)),
      ...inputs.map(({inlineScript}) => inlineScript?.bytes?.length ?? 0),
    ]),
    protocolParameters,
    redeemers.map((redeemer) => redeemer.exUnits)
  )
  return fee
}

export function computeRequiredDeposit(
  certificates: Array<TxCertificate>,
  stakeKeyDeposit: number
): Lovelace {
  // TODO: this to network config
  const CertificateDeposit: {[key in TxCertificateType]: number} = {
    [TxCertificateType.STAKE_DELEGATION]: 0,
    [TxCertificateType.STAKE_REGISTRATION]: stakeKeyDeposit,
    [TxCertificateType.STAKE_DEREGISTRATION]: -stakeKeyDeposit,
    [TxCertificateType.VOTE_DELEGATION]: 0,
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
  minUtxoDepositCoefficient,
}: {
  changeAddress: Address
  changeTokenBundle: TokenBundle
  maxOutputTokens: number
  minUtxoDepositCoefficient: number
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
      coins: computeMinUTxOLovelaceAmount({
        minUtxoDepositCoefficient,
        output,
      }),
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
