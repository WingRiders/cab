import {encode} from 'borc'
import {addressToBuffer, hasSpendingScript} from 'cardano-crypto.js'
import {uniq} from 'lodash'

import {MAX_INT32, MAX_INT64} from '@/constants'
import {spendingHashFromAddress} from '@/ledger/address/addressHelpers'
import {AddrKeyHash} from '@/types/address'
import {Address, Lovelace, TokenBundle, ZeroLovelace} from '@/types/base'
import {
  TxCertificate,
  TxDatum,
  TxInput,
  TxInputRef,
  TxOutput,
  TxRedeemer,
  TxScriptSource,
  TxWithdrawal,
  UTxO,
} from '@/types/transaction'
import {TxPlanMetadata} from '@/types/txPlan'

import {CborInt64} from './cbor/CborInt64'
import {
  cborizeRequiredSigners,
  cborizeTxCertificates,
  cborizeTxDatums,
  cborizeTxInputs,
  cborizeTxOutputs,
  cborizeTxOutputTokenBundle,
  cborizeTxRedeemers,
  cborizeTxScripts,
  cborizeTxWithdrawals,
} from './cbor/cborize'
import {encodeMetadata} from './metadata/encodeMetadata'
import {INTEGRITY_HASH_BYTE_LENGTH, METADATA_HASH_BYTE_LENGTH, TX_WITNESS_SIZES} from './txConstants'

export function estimateMetadataSize(metadata: TxPlanMetadata): number {
  const draftMetadata = encodeMetadata({...metadata})
  return encode(draftMetadata).length
}

interface EstimateParams {
  inputs: Array<TxInput>
  referenceInputs: Array<TxInputRef>
  outputs: Array<TxOutput>
  certificates: Array<TxCertificate>
  withdrawals: Array<TxWithdrawal>
  datums: Array<TxDatum>
  redeemers: Array<TxRedeemer>
  collateralInputs: Array<TxInput>
  scripts: Array<TxScriptSource>
  mint: TokenBundle
  requiredSigners?: Array<AddrKeyHash>
  metadata?: TxPlanMetadata
}

// Estimates size of final transaction in bytes.
// Note(ppershing): can overshoot a bit
export function estimateTxSize({
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
  requiredSigners = [],
  metadata,
}: EstimateParams): number {
  // the 1 is there for the key in the tx map
  const txInputsSize = encode(cborizeTxInputs(inputs)).length + 1
  const txReferenceInputsSize =
    referenceInputs.length > 0 ? encode(cborizeTxInputs(referenceInputs)).length + 1 : 0
  const txCollateralInputsSize =
    collateralInputs.length > 0 ? encode(cborizeTxInputs(collateralInputs)).length + 1 : 0

  /*
   * we have to estimate size of tx outputs since we are calculating
   * fee also in cases we dont know the amount of coins in advance
   */
  const txOutputs: TxOutput[] = outputs.map((output) => ({
    ...output,
    coins: new Lovelace(MAX_INT64) as Lovelace,
  }))
  // TODO: max output size
  const txOutputsSize = encode(cborizeTxOutputs(txOutputs)).length + 1
  const txMintSize = mint.length > 0 ? encode(cborizeTxOutputTokenBundle(mint, true)).length + 1 : 0

  const MAX_ENCODED_INTEGER_SIZE = encode(new CborInt64(MAX_INT64)).length + 1

  const txCertificatesSize = encode(cborizeTxCertificates(certificates)).length + 1
  const txWithdrawalsSize = encode(cborizeTxWithdrawals(withdrawals)).length + 1
  const txTtlSize = MAX_ENCODED_INTEGER_SIZE
  const txValidityStartSize = MAX_ENCODED_INTEGER_SIZE // TODO only include optionally
  const txFeeSize = MAX_ENCODED_INTEGER_SIZE
  const txNetworkIdSize = 2 // key + (0 | 1) TODO only include optionally
  const txAuxiliaryDatumHashSize = metadata /* encoded as a buffer */
    ? METADATA_HASH_BYTE_LENGTH + 2 /* cbor header */ + 1 /* key */
    : 0
  const txScriptIntegrityHashSize =
    redeemers.length > 0 || datums.length > 0
      ? INTEGRITY_HASH_BYTE_LENGTH + 2 /* cbor header */ + 1 /* key */
      : 0
  const txRequiredSignersSize =
    requiredSigners.length > 0 ? encode(cborizeRequiredSigners(requiredSigners)).length + 1 : 0
  const txAuxSize =
    txInputsSize +
    txReferenceInputsSize /* new in Babbage */ +
    txCollateralInputsSize /* new in Alonzo */ +
    txOutputsSize +
    txMintSize +
    txCertificatesSize +
    txWithdrawalsSize +
    txFeeSize +
    txNetworkIdSize /* new in Alonzo */ +
    txTtlSize +
    txValidityStartSize /* new in Alonzo */ +
    txScriptIntegrityHashSize /* new in Alonzo */ +
    txAuxiliaryDatumHashSize +
    txRequiredSignersSize /* new in Alonzo */

  const shelleyInputs = [...inputs, ...collateralInputs]

  const requiredPubKeySignatures = uniq([
    ...shelleyInputs
      .filter(({address}) => !hasSpendingScript(addressToBuffer(address)))
      .map(({address}) => spendingHashFromAddress(address)),
    ...requiredSigners,
  ])

  // TODO: Possible overestimation:
  // - withdrawals and certificates can be signed with the same key
  // - verify estimation of TX_WITNESS_SIZES.shelley
  const shelleyWitnessesSize =
    (withdrawals.length + certificates.length + requiredPubKeySignatures.length) *
    TX_WITNESS_SIZES.shelley

  const alonzoWitnessSize =
    (datums.length > 0 ? encode(cborizeTxDatums(datums)).length + 1 : 0) +
    (redeemers.length > 0 ? encode(cborizeTxRedeemers(redeemers, inputs, mint)).length + 1 : 0) +
    (scripts.length > 0 ? encode(cborizeTxScripts(scripts)).length + 1 : 0)

  const txWitnessesSize = shelleyWitnessesSize + alonzoWitnessSize

  // Assuming simple metadata structure without any addition scripts
  const txAuxiliaryDataSize = metadata ? estimateMetadataSize(metadata) + 1 : 1

  // the 1 is there for the CBOR "tag" for an array of 2 elements
  const txSizeInBytes = 1 + txAuxSize + txWitnessesSize + txAuxiliaryDataSize

  /*
   * the slack is there for the array of tx witnesses
   * because it may have more than 1 byte of overhead
   * if more than 16 elements are present
   */
  const slack = 1 // TODO
  const validityFlag = 1

  return txSizeInBytes + slack + validityFlag
}

export function estimateAdditionalCollateralSize(initial = false) {
  const extraCollateral: UTxO[] = [
    {
      outputIndex: MAX_INT32,
      txHash: 'deadbeef'.repeat(8),
      address: '' as Address, // irrelevant for size calculation
      coins: ZeroLovelace, // irrelevant for size calculation
      tokenBundle: [], //irrelevant for size calculation
    },
  ]
  return (
    encode(cborizeTxInputs(extraCollateral)).length +
    TX_WITNESS_SIZES.shelley /* collateral might need an extra signature, assuming shelley address */ +
    (initial
      ? 1 /* the collateral header */
      : -encode(cborizeTxInputs([])).length) /* remove the array overhead */
  )
}
