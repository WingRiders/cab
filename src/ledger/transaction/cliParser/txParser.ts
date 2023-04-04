import {TxCertificateType, BigNumber} from '@/types'
import {Errors} from './errors'
import {
  isDelegationCert,
  isUint64,
  isStakepoolRegistrationCert,
  isStakingKeyDeregistrationCert,
  isTxInput,
  isTxMultiHostNameRelay,
  isTxOutput,
  isTxSingleHostIPRelay,
  isTxSingleHostNameRelay,
  isTxStakingKeyRegistrationCert,
  isWithdrawalsMap,
  isArrayOfType,
} from './guards'
import {
  _Input,
  _Output,
  _DelegationCert,
  _StakingKeyRegistrationCert,
  _StakingKeyDeregistrationCert,
  _StakepoolRegistrationCert,
  _Withdrawal,
  _UnsignedTxDecoded,
  _UnsignedTxParsed,
  _Certificate,
  TxRelayTypes,
  _PoolRelay,
  _SingleHostIPRelay,
  _SingleHostNameRelay,
  _MultiHostNameRelay,
  TxInput,
  TxOutput,
  Lovelace,
  _MultiAsset,
  _Asset,
  TxBodyKeys,
} from './types'

const parseTxInputs = (txInputs: any[]): _Input[] => {
  if (!isArrayOfType<TxInput>(txInputs, isTxInput)) {
    throw Error(Errors.TxInputParseError)
  }
  return txInputs.map(([txHash, outputIndex]): _Input => ({txHash, outputIndex}))
}

const parseAssets = (assets: any): _Asset[] => {
  if (!(assets instanceof Map)) {
    throw Error(Errors.TxAssetParseError)
  }
  return Array.from(assets).map(([assetName, amount]) => {
    if (!Buffer.isBuffer(assetName)) {
      throw Error(Errors.AssetNameParseError)
    }
    // TODO: is lovelace is not the best name since its not a lovelace
    if (!isUint64(amount)) {
      throw Error(Errors.AssetAmountParseError)
    }
    return {assetName, amount: new BigNumber(amount)}
  })
}

const parseMultiAsset = (multiAsset: any): _MultiAsset[] => {
  if (!(multiAsset instanceof Map)) {
    throw Error(Errors.TxMultiAssetParseError)
  }
  return Array.from(multiAsset).map(([policyId, assets]) => {
    if (!Buffer.isBuffer(policyId)) {
      throw Error(Errors.PolicyIdParseError)
    }
    return {policyId, assets: parseAssets(assets)}
  })
}

const parseTxOutputs = (txOutputs: any[]): _Output[] => {
  if (!isArrayOfType<TxOutput>(txOutputs, isTxOutput)) {
    throw Error(Errors.TxOutputParseArrayError)
  }

  const parseAmount = (amount: any): {coins: BigNumber; tokenBundle: _MultiAsset[]} => {
    if (isUint64(amount)) {
      return {coins: new BigNumber(amount), tokenBundle: []}
    }
    const [coins, multiAsset] = amount
    if (!isUint64(coins)) {
      throw Error(Errors.TxOutputParseCoinError)
    }
    return {coins: new BigNumber(coins), tokenBundle: parseMultiAsset(multiAsset)}
  }

  return txOutputs.map(([address, amount]): _Output => ({address, ...parseAmount(amount)}))
}

const parseRelay = (poolRelay: any): _PoolRelay => {
  const parseSingleHostIPRelay = (relay: any): _SingleHostIPRelay => {
    if (!isTxSingleHostIPRelay(relay)) {
      throw Error(Errors.TxSingleHostIPRelayParseError)
    }
    const [type, portNumber, ipv4, ipv6] = relay
    return {
      type,
      portNumber,
      ipv4,
      ipv6,
    }
  }
  const parseSingleHostNameRelay = (relay: any): _SingleHostNameRelay => {
    if (!isTxSingleHostNameRelay(relay)) {
      throw Error(Errors.TxSingleHostNameRelayParseError)
    }
    const [type, portNumber, dnsName] = relay
    return {
      type,
      portNumber,
      dnsName,
    }
  }
  const parseMultiHostNameRelay = (relay: any): _MultiHostNameRelay => {
    if (!isTxMultiHostNameRelay(relay)) {
      throw Error(Errors.TxMultiHostNameRelayParseError)
    }
    const [type, dnsName] = relay
    return {
      type,
      dnsName,
    }
  }
  switch (poolRelay[0]) {
    case TxRelayTypes.SINGLE_HOST_IP:
      return parseSingleHostIPRelay(poolRelay)
    case TxRelayTypes.SINGLE_HOST_NAME:
      return parseSingleHostNameRelay(poolRelay)
    case TxRelayTypes.MULTI_HOST_NAME:
      return parseMultiHostNameRelay(poolRelay)
    default:
      throw Error(Errors.UnsupportedRelayTypeError)
  }
}

const parseTxCerts = (txCertificates: any[]): _Certificate[] => {
  const stakeKeyRegistrationCertParser = (txCertificate: any): _StakingKeyRegistrationCert => {
    if (!isTxStakingKeyRegistrationCert(txCertificate)) {
      throw Error(Errors.TxStakingKeyRegistrationCertParseError)
    }
    const [type, [, pubKeyHash]] = txCertificate
    return {type, pubKeyHash}
  }

  const stakeKeyDeregistrationCertParser = (txCertificate: any): _StakingKeyDeregistrationCert => {
    if (!isStakingKeyDeregistrationCert(txCertificate)) {
      throw Error(Errors.TxStakingKeyDeregistrationCertParseError)
    }
    const [type, [, pubKeyHash]] = txCertificate
    return {type, pubKeyHash}
  }

  const delegationCertParser = (txCertificate: any): _DelegationCert => {
    if (!isDelegationCert(txCertificate)) {
      throw Error(Errors.TxDelegationCertParseError)
    }
    const [type, [, pubKeyHash], poolHash] = txCertificate
    return {type, pubKeyHash, poolHash}
  }

  const stakepoolRegistrationCertParser = (txCertificate: any): _StakepoolRegistrationCert => {
    if (!isStakepoolRegistrationCert(txCertificate)) {
      throw Error(Errors.TxStakepoolRegistrationCertParseError)
    }
    const [
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge,
      cost,
      {value},
      rewardAddress,
      poolOwnersPubKeyHashes,
      relays,
      metadata,
    ] = txCertificate
    return {
      type,
      poolKeyHash,
      vrfPubKeyHash,
      pledge: new BigNumber(pledge),
      cost: new BigNumber(cost),
      margin: {numerator: value[0], denominator: value[1]}, // tagged
      rewardAddress,
      poolOwnersPubKeyHashes,
      relays: relays.map(parseRelay),
      metadata: metadata ? {metadataUrl: metadata[0], metadataHash: metadata[1]} : null,
    }
  }

  const parseTxCert = (cert: any) => {
    switch (cert[0]) {
      case TxCertificateType.STAKING_KEY_REGISTRATION:
        return stakeKeyRegistrationCertParser(cert)
      case TxCertificateType.STAKING_KEY_DEREGISTRATION:
        return stakeKeyDeregistrationCertParser(cert)
      case TxCertificateType.DELEGATION:
        return delegationCertParser(cert)
      case TxCertificateType.STAKEPOOL_REGISTRATION:
        return stakepoolRegistrationCertParser(cert)
      default:
        throw Error(Errors.UnsupportedCertificateTypeError)
    }
  }

  return txCertificates.map((certificate) => parseTxCert(certificate))
}

const parseTxWithdrawals = (withdrawals: any): _Withdrawal[] => {
  if (!isWithdrawalsMap(withdrawals)) {
    throw Error(Errors.WithrawalsParseError)
  }
  return Array.from(withdrawals).map(
    ([address, coins]): _Withdrawal => ({address, coins: new BigNumber(coins)})
  )
}

const parseFee = (fee: any): Lovelace => {
  if (!isUint64(fee)) {
    throw Error(Errors.FeeParseError)
  }
  return new BigNumber(fee)
}

const parseTtl = (ttl: any): BigNumber | undefined => {
  if (ttl && !isUint64(ttl)) {
    throw Error(Errors.TTLParseError)
  }
  return ttl && new BigNumber(ttl)
}

const parseValidityIntervalStart = (validityIntervalStart: any): BigNumber | undefined => {
  if (validityIntervalStart && !isUint64(validityIntervalStart)) {
    throw Error(Errors.ValidityIntervalStartParseError)
  }
  return validityIntervalStart && new BigNumber(validityIntervalStart)
}

const parseMetaDataHash = (metaDataHash: any): Buffer | undefined => {
  if (metaDataHash && !Buffer.isBuffer(metaDataHash)) {
    throw Error(Errors.MetaDataHashParseError)
  }
  return metaDataHash
}

const parseUnsignedTx = ([txBody, meta]: _UnsignedTxDecoded): _UnsignedTxParsed => {
  if (txBody.get(TxBodyKeys.MINT)) {
    throw Error(Errors.MintUnsupportedError)
  }
  const inputs = parseTxInputs(txBody.get(TxBodyKeys.INPUTS))
  const outputs = parseTxOutputs(txBody.get(TxBodyKeys.OUTPUTS))
  const fee = parseFee(txBody.get(TxBodyKeys.FEE))
  const ttl = parseTtl(txBody.get(TxBodyKeys.TTL))
  const certificates = parseTxCerts(txBody.get(TxBodyKeys.CERTIFICATES) || [])
  const withdrawals = parseTxWithdrawals(txBody.get(TxBodyKeys.WITHDRAWALS) || new Map())
  const metaDataHash = parseMetaDataHash(txBody.get(TxBodyKeys.AUXILIARY_DATA_HASH))
  const validityIntervalStart = parseValidityIntervalStart(
    txBody.get(TxBodyKeys.VALIDITY_INTERVAL_START)
  )

  return {
    inputs,
    outputs,
    fee,
    ttl,
    certificates,
    withdrawals,
    metaDataHash,
    meta,
    validityIntervalStart,
    // mint, // unsupported in current version
  }
}

export {parseUnsignedTx}
