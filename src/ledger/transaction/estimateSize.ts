import {encode} from 'borc'
import {uniq, partition} from 'lodash'
import {Lovelace, TokenBundle, Address, ZeroLovelace} from '@/types/base'
import {
  TxDatum,
  TxRedeemer,
  TxScript,
  TxCertificate,
  TxInput,
  TxOutput,
  TxWithdrawal,
  UTxO,
} from '@/types/transaction'
import {isShelleyFormat, isV1Address, spendingHashFromAddress} from '@/ledger/address/addressHelpers'
import {
  CATALYST_SIGNATURE_BYTE_LENGTH,
  INTEGRITY_HASH_BYTE_LENGTH,
  METADATA_HASH_BYTE_LENGTH,
  TX_WITNESS_SIZES,
} from './txConstants'
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
import {addressToBuffer, hasSpendingScript} from 'cardano-crypto.js'
import {MAX_INT32, MAX_INT64} from '@/constants'
import {CborInt64} from './cbor/CborInt64'
import {encodeMetadata} from './metadata/encodeMetadata'
import {CatalystVotingSignature, TxPlanMetadata} from '@/types/txPlan'
import {AddrKeyHash} from '@/types/address'

export function estimateMetadataSize(metadata: TxPlanMetadata): number {
  let mockSignature: CatalystVotingSignature | undefined
  if (metadata.votingData && !metadata.votingSignature) {
    mockSignature = 'x'.repeat(CATALYST_SIGNATURE_BYTE_LENGTH * 2)
  }
  const draftMetadata = encodeMetadata({...metadata, votingSignature: mockSignature})
  return encode(draftMetadata).length
}

interface EstimateParams {
  inputs: Array<TxInput>
  outputs: Array<TxOutput>
  certificates: Array<TxCertificate>
  withdrawals: Array<TxWithdrawal>
  datums: Array<TxDatum>
  redeemers: Array<TxRedeemer>
  collateralInputs: Array<TxInput>
  scripts: Array<TxScript>
  mint: TokenBundle
  requiredSigners?: Array<AddrKeyHash>
  metadata?: TxPlanMetadata
}

// Estimates size of final transaction in bytes.
// Note(ppershing): can overshoot a bit
export function estimateTxSize({
  inputs,
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
  const txMintSize = mint.length > 0 ? encode(cborizeTxOutputTokenBundle(mint)).length + 1 : 0

  const MAX_ENCODED_INTEGER_SIZE = encode(new CborInt64(MAX_INT64)).length + 1

  const txCertificatesSize = encode(cborizeTxCertificates(certificates)).length + 1
  const txWithdrawalsSize = encode(cborizeTxWithdrawals(withdrawals)).length + 1
  const txTtlSize = MAX_ENCODED_INTEGER_SIZE
  const txValidityStartSize = MAX_ENCODED_INTEGER_SIZE // TODO only include optionally
  const txFeeSize = MAX_ENCODED_INTEGER_SIZE
  const txNetworkIdSize = 2 // key + (0 | 1) TODO only include optionally
  const txAuxiliaryDataHashSize = metadata /* encoded as a buffer */
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
    txAuxiliaryDataHashSize +
    txRequiredSignersSize /* new in Alonzo */

  const allInputs = [...inputs, ...collateralInputs]
  const [shelleyInputs, byronInputs] = partition(allInputs, ({address}) => isShelleyFormat(address))

  const requiredPubKeySignatures = uniq([
    ...shelleyInputs
      .filter(({address}) => !hasSpendingScript(addressToBuffer(address)))
      .map(({address}) => spendingHashFromAddress(address)),
    ...requiredSigners,
  ])

  const shelleyWitnessesSize =
    (withdrawals.length + certificates.length + requiredPubKeySignatures.length) *
    TX_WITNESS_SIZES.shelley

  const byronWitnessesSize = byronInputs.reduce((acc, {address}) => {
    const witnessSize = isV1Address(address) ? TX_WITNESS_SIZES.byronV1 : TX_WITNESS_SIZES.byronv2
    return acc + witnessSize
  }, 0)

  const alonzoWitnessSize =
    (datums.length > 0 ? encode(cborizeTxDatums(datums)).length + 1 : 0) +
    (redeemers.length > 0 ? encode(cborizeTxRedeemers(redeemers, inputs, mint)).length + 1 : 0) +
    (scripts.length > 0 ? encode(cborizeTxScripts(scripts)).length + 1 : 0)

  const txWitnessesSize = shelleyWitnessesSize + byronWitnessesSize + alonzoWitnessSize

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
