import {
  TxStakepoolOwner,
  TxStakepoolMargin,
  TxStakepoolRelay,
  TxRelayType,
  TxPoolParams,
  BigNumber,
} from '@/types'
import {
  TxRelayTypes,
  _Margin,
  _PoolRelay,
  _StakepoolRegistrationCert,
} from '@/ledger/transaction/cliParser/types'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {MAX_INT64, MIN_INT64} from '@/constants'

const enum PoolParamsByteLengths {
  POOL_HASH = 28,
  VRF = 32,
  IPV4 = 4,
  IPV6 = 16,
  OWNER = 28,
  REWARD = 29,
  METADATA_HASH = 32,
}

// cli tool supports bigint and we ensure that it's within the limits we support, so we need to restrict it
export const ensureIsSafeInt = (value: BigNumber | number | string, variableName: string): BigNumber => {
  const valueType = typeof value
  if (
    valueType !== 'bigint' &&
    valueType !== 'number' &&
    !(valueType === 'object' && BigNumber.isBigNumber(value)) &&
    valueType !== 'string'
  ) {
    throw new Error(`${variableName} has invalid type ${valueType}.`)
  }
  const valueBN = new BigNumber(value)
  if (!valueBN.isInteger()) {
    throw new Error(`${variableName} is not a valid integer.`)
  }
  if (valueBN.gt(MAX_INT64) || valueBN.lt(MIN_INT64)) {
    throw new Error(
      `${variableName} value is too big. Numbers bigger than ${MAX_INT64} are not supported.`
    )
  }
  return valueBN
}

const buf2hexLengthCheck = (buffer: Buffer, correctByteLength: number, variableName: string) => {
  if (!Buffer.isBuffer(buffer) || Buffer.byteLength(buffer) !== correctByteLength) {
    throw new CabInternalError(CabInternalErrorReason.PoolRegIncorrectBufferLength, {
      message: variableName,
    })
  }
  return buffer.toString('hex')
}

const parseStakepoolOwners = (poolOwners: Buffer[]): TxStakepoolOwner[] => {
  const hexOwners: Array<string> = poolOwners.map((owner) =>
    buf2hexLengthCheck(owner, PoolParamsByteLengths.OWNER, 'Owner key hash')
  )
  const constainsDuplicates = new Set(hexOwners).size !== hexOwners.length
  if (constainsDuplicates) {
    throw new CabInternalError(CabInternalErrorReason.PoolRegDuplicateOwners)
  }

  return hexOwners.map((owner) => {
    return {stakingKeyHashHex: owner}
  })
}

const parseStakepoolMargin = (marginObj: _Margin): TxStakepoolMargin => {
  if (
    !marginObj ||
    !marginObj.hasOwnProperty('denominator') ||
    !marginObj.hasOwnProperty('numerator') ||
    marginObj.numerator < 0 ||
    marginObj.denominator <= 0 ||
    marginObj.numerator > marginObj.denominator
  ) {
    throw new CabInternalError(CabInternalErrorReason.PoolRegInvalidMargin)
  }
  return {
    numeratorStr: marginObj.numerator.toString(),
    denominatorStr: marginObj.denominator.toString(),
  }
}

const ipv4BufToAddress = (ipv4Buf: Buffer) => {
  buf2hexLengthCheck(ipv4Buf, PoolParamsByteLengths.IPV4, 'Ipv4 Relay')
  return Array.from(new Uint8Array(ipv4Buf)).join('.')
}

const ipv6BufToAddress = (ipv6Buf: Buffer) => {
  const copy = Buffer.from(ipv6Buf)
  const endianSwappedBuf = copy.swap32()
  const ipv6Hex = buf2hexLengthCheck(endianSwappedBuf, PoolParamsByteLengths.IPV6, 'Ipv6 Relay')
  const ipv6AddressSemicolons = ipv6Hex.replace(/(.{4})/g, '$1:').slice(0, -1)
  return ipv6AddressSemicolons
}

const parseStakepoolRelays = (relays: _PoolRelay[]): TxStakepoolRelay[] =>
  relays.map((relay) => {
    switch (relay.type) {
      case TxRelayTypes.SINGLE_HOST_IP:
        return {
          type: TxRelayType.SINGLE_HOST_IP,
          params: {
            portNumber: relay.portNumber,
            ipv4: relay.ipv4 ? ipv4BufToAddress(relay.ipv4) : undefined,
            ipv6: relay.ipv6 ? ipv6BufToAddress(relay.ipv6) : undefined,
          },
        }
      case TxRelayTypes.SINGLE_HOST_NAME:
        return {
          type: TxRelayType.SINGLE_HOST_NAME,
          params: {
            portNumber: relay.portNumber,
            dnsName: relay.dnsName,
          },
        }
      case TxRelayTypes.MULTI_HOST_NAME:
        return {
          type: TxRelayType.MULTI_HOST_NAME,
          params: {
            dnsName: relay.dnsName,
          },
        }
      default:
        throw new CabInternalError(CabInternalErrorReason.PoolRegInvalidRelay)
    }
  })

const parseStakepoolMetadata = (metadata: {metadataUrl: string; metadataHash: Buffer} | null) => {
  if (!metadata) {
    return null
  }
  if (!metadata.metadataHash || !metadata.metadataUrl) {
    throw new CabInternalError(CabInternalErrorReason.PoolRegInvalidMetadata)
  }
  return {
    metadataUrl: metadata.metadataUrl,
    metadataHashHex: buf2hexLengthCheck(
      metadata.metadataHash,
      PoolParamsByteLengths.METADATA_HASH,
      'Metadata hash'
    ),
  }
}

export const parseStakepoolRegistrationCertificate = ({
  poolKeyHash,
  vrfPubKeyHash,
  pledge,
  cost,
  margin,
  rewardAddress,
  poolOwnersPubKeyHashes,
  relays,
  metadata,
}: _StakepoolRegistrationCert): TxPoolParams => ({
  poolKeyHashHex: buf2hexLengthCheck(poolKeyHash, PoolParamsByteLengths.POOL_HASH, 'Pool key hash'),
  vrfKeyHashHex: buf2hexLengthCheck(vrfPubKeyHash, PoolParamsByteLengths.VRF, 'VRF key hash'),
  pledgeStr: ensureIsSafeInt(pledge, 'Pledge').toString(),
  costStr: ensureIsSafeInt(cost, 'Fixed cost').toString(),
  margin: parseStakepoolMargin(margin),
  rewardAccountHex: buf2hexLengthCheck(rewardAddress, PoolParamsByteLengths.REWARD, 'Reward account'),
  poolOwners: parseStakepoolOwners(poolOwnersPubKeyHashes),
  relays: parseStakepoolRelays(relays),
  metadata: parseStakepoolMetadata(metadata),
})
