import {compact, groupBy} from 'lodash'

import {TxMetadata, TxMetadatum, TxMetadatumLabel} from '@/types/transaction'
import {TxPlanMetadata} from '@/types/txPlan'

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

function encodeNfts({version, data: nfts}: NonNullable<TxPlanMetadata['nfts']>): TxMetadatum {
  // NFT standard defined by cip25, found at:
  // https://cips.cardano.org/cips/cip25/
  const encodedNfts = new Map<TxMetadatum, Map<string | Buffer, Map<string, TxMetadatum>> | number>()

  Object.entries(groupBy(nfts, 'policyId')).forEach(([policyId, nfts]) => {
    const assets = new Map<string | Buffer, Map<string, TxMetadatum>>()
    nfts.forEach((nft) => {
      const properties = new Map<string, TxMetadatum>(
        compact([
          ['name', splitMetadatumString(nft.name)],
          ['image', splitMetadatumString(nft.image)],
          nft.description && ['description', splitMetadatumString(nft.description)],
          nft.mediaType && ['mediaType', splitMetadatumString(nft.mediaType)],
          nft.files && [
            'files',
            nft.files.map(
              (file) =>
                new Map<string, TxMetadatum>([
                  ['name', splitMetadatumString(file.name)],
                  ['mediaType', splitMetadatumString(file.mediaType)],
                  ['src', splitMetadatumString(file.src)],
                ])
            ),
          ],
          ...(nft.otherProperties ? Array.from(nft.otherProperties.entries()) : []),
        ])
      )

      // version 1 and 2 are using different encoding for keys
      const assetNameBuffer = Buffer.from(nft.assetName, 'hex')
      const assetKey = version === 1 ? assetNameBuffer.toString('utf8') : assetNameBuffer

      assets.set(assetKey, properties)
    })
    const policyIdKey = version === 1 ? policyId : Buffer.from(policyId, 'hex')
    encodedNfts.set(policyIdKey, assets)
  })

  encodedNfts.set('version', version)
  return encodedNfts
}

/**
 * Encode the plan metadata into the format expected as part of the transaction
 * metadata
 *
 * Tag registry can be found at:
 * https://github.com/cardano-foundation/CIPs/blob/master/CIP-0010/registry.json
 */
export const encodeMetadata = (metadata?: TxPlanMetadata): TxMetadata | null => {
  if (!metadata) {
    return null
  }
  const txMetadata = new Map(metadata.custom?.entries() ?? [])
  if (metadata.message) {
    txMetadata.set(TxMetadatumLabel.MESSAGE, encodeMessage(metadata.message))
  }
  if (metadata.nfts) {
    txMetadata.set(TxMetadatumLabel.NFT, encodeNfts(metadata.nfts))
  }
  return txMetadata
}
