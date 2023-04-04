import {HexString} from '@/types'
import {TxMetadata, TxMetadatum, TxMetadatumLabel} from '@/types/transaction'
import {TxPlanMetadata, CatalystVotingRegistrationData} from '@/types/txPlan'
import {bech32} from 'cardano-crypto.js'

const METADTA_MAX_STR_LENGTH = 64

export function splitMetadatumString(str: string): string | string[] {
  if (str.length < METADTA_MAX_STR_LENGTH) {
    return str
  }
  const chunks: string[] = []
  let remainingStr = str
  while (remainingStr.length > METADTA_MAX_STR_LENGTH) {
    chunks.push(remainingStr.slice(0, METADTA_MAX_STR_LENGTH))
    remainingStr = remainingStr.slice(METADTA_MAX_STR_LENGTH)
  }
  if (remainingStr.length > 0) {
    chunks.push(remainingStr)
  }
  return chunks
}

function encodeMessage(messages: string[]): TxMetadatum {
  // Message standard defined by cip20, found at:
  // https://cips.cardano.org/cips/cip20/

  // each message must have at most 64 bytes. This breaks larger messages into at-most-64-byte chunks
  const splitMessages = messages.map(splitMetadatumString).flat()

  return new Map<string, string[]>([['msg', splitMessages]])
}

/**
 * Encode the voting registartion data to the expected standard structure
 * expected in the transactions.
 *
 * @param votindData
 * @returns
 */
export function encodeVotingRegistrationData({
  votingPubKey,
  stakePubKey,
  rewardDestinationAddress,
  nonce,
}: CatalystVotingRegistrationData): TxMetadatum {
  return new Map<number, Buffer | number>([
    [2, Buffer.from(stakePubKey, 'hex')],
    [1, Buffer.from(votingPubKey, 'hex')],
    [3, bech32.decode(rewardDestinationAddress.address).data],
    [4, Number(nonce).valueOf()],
  ])
}

/**
 * Encode the signature into the format expected in the metadta
 * @param signature
 * @returns
 */
export function encodeVotingSignature(signature: HexString): TxMetadatum {
  return new Map<number, Buffer>([[1, Buffer.from(signature, 'hex')]])
}

/**
 * Encode the plan metadata into the format expected as part of the transaction
 * metadata
 *
 * Tag registry can be found at:
 * https://cips.cardano.org/cips/cip10/registry.json
 */
export const encodeMetadata = (metadata?: TxPlanMetadata): TxMetadata | null => {
  if (!metadata) {
    return null
  }
  const txMetadata = new Map(metadata.custom?.entries() ?? [])
  if (metadata.votingData && metadata.votingSignature) {
    // WARNING used for estimation and tests
    // otherwise the signature and voting data needs to be added by the crypto provider
    // as the data needs to be signed
    txMetadata.set(
      TxMetadatumLabel.CATALYST_VOTING_REGISTRATION_DATA,
      encodeVotingRegistrationData(metadata.votingData)
    )
    txMetadata.set(
      TxMetadatumLabel.CATALYST_VOTING_SIGNATURE,
      encodeVotingSignature(metadata.votingSignature)
    )
  }
  if (metadata.message) {
    txMetadata.set(TxMetadatumLabel.MESSAGE, encodeMessage(metadata.message))
  }
  return txMetadata
}
