import {
  Address,
  BigNumber,
  Token,
  Lovelace,
  TxCertificateType,
  TxCertificate,
  TxInput,
  TxOutput,
  TxWithdrawal,
  TxPlan,
  ZeroLovelace,
  ProtocolParameters,
} from '@/types'
import {encodeAddress} from '@/ledger/address'
import {CborizedCliWitness} from '@/ledger/transaction/cbor/cborizedTx'
import {encode, decode} from 'borc'
import {parseUnsignedTx} from '@/ledger/transaction/cliParser/txParser'
import {
  _Certificate,
  _Input,
  _MultiAsset,
  _Output,
  _UnsignedTxParsed,
  _Withdrawal,
} from '@/ledger/transaction/cliParser/types'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {ensureIsSafeInt, parseStakepoolRegistrationCertificate} from './poolCertificateUtils'
import JSONBig from 'json-bigint'
import {chain} from 'lodash'

type CliTxBodyType = 'TxUnsignedShelley' | 'TxBodyAllegra' | 'TxBodyMary' | 'TxBodyAlonzo'
type CliTxWitnessType =
  | 'TxWitnessShelley'
  | 'TxWitness AllegraEra'
  | 'TxWitness MaryEra'
  | 'TxWitness AlonzoEra'
const preferredCliTxBodyType: CliTxBodyType = 'TxBodyMary'
const cliTxBodyTypeToWitnessType: {[K in CliTxBodyType]: CliTxWitnessType} = {
  TxUnsignedShelley: 'TxWitnessShelley',
  TxBodyAllegra: 'TxWitness AllegraEra',
  TxBodyMary: 'TxWitness MaryEra',
  TxBodyAlonzo: 'TxWitness AlonzoEra',
}

const validatePoolRegUnsignedTx = (unsignedTx: _UnsignedTxParsed) => {
  if (
    !unsignedTx ||
    !unsignedTx.certificates ||
    unsignedTx.certificates.length !== 1 ||
    unsignedTx.certificates[0].type !== TxCertificateType.STAKEPOOL_REGISTRATION
  ) {
    throw new Error(
      'Pool registration transaction must include exactly one pool registration certficate.'
    )
  }
  if (unsignedTx.withdrawals.length > 0) {
    throw new Error("Pool registration transaction can't include reward withdrawals.")
  }
  return null
}

const parseCliTokens = (tokenBundle: _MultiAsset[]): Token[] =>
  chain(tokenBundle)
    .map((token) =>
      token.assets.map((asset) => ({
        policyId: token.policyId.toString('hex'),
        assetName: asset.assetName.toString('hex'),
        quantity: ensureIsSafeInt(asset.amount, 'Token amount'),
      }))
    )
    .flatten()
    .value()

const parseCliInputs = (inputs: _Input[]): TxInput[] => {
  return inputs.map((input) => {
    return {
      txHash: input.txHash.toString('hex'),
      outputIndex: input.outputIndex,
      coins: ZeroLovelace,
      tokenBundle: [],
      address: '' as Address,
    }
  })
}

const parseCliOutputs = (outputs: _Output[]): TxOutput[] => {
  return outputs.map((output) => {
    return {
      isChange: false,
      address: encodeAddress(output.address),
      coins: ensureIsSafeInt(output.coins, 'Output coins') as Lovelace,
      tokenBundle: parseCliTokens(output.tokenBundle),
    }
  })
}

const parseCliCertificates = (
  certificates: _Certificate[],
  stakingAddress: Address
): TxCertificate[] => {
  return certificates.map((certificate) => {
    if (certificate.type !== TxCertificateType.STAKEPOOL_REGISTRATION) {
      throw new CabInternalError(CabInternalErrorReason.PoolRegTxParserError) // TODO
    }
    return {
      type: TxCertificateType.STAKEPOOL_REGISTRATION,
      stakingAddress,
      poolRegistrationParams: parseStakepoolRegistrationCertificate(certificate),
    }
  })
}

const parseCliWithdrawals = (withdrawals: _Withdrawal[], stakingAddress: Address): TxWithdrawal[] => {
  if (withdrawals.length > 0) throw new CabInternalError(CabInternalErrorReason.PoolRegTxParserError)
  return [] // pool reg tx cant have withdrawals
}

const parseCliTtl = (ttl: BigNumber | undefined): BigNumber | null =>
  ttl !== undefined ? ensureIsSafeInt(ttl, 'Ttl') : null

const parseCliFee = (fee: string | number | BigNumber): BigNumber => ensureIsSafeInt(fee, 'Fee')

const parseCliValidityIntervalStart = (validityIntervalStart: BigNumber | undefined): BigNumber | null =>
  validityIntervalStart !== undefined
    ? ensureIsSafeInt(validityIntervalStart, 'Validity interval start')
    : null

const unsignedPoolTxToTxPlan = (
  unsignedTx: _UnsignedTxParsed,
  stakingAddress: Address,
  protocolParameters: ProtocolParameters
): TxPlan => {
  return {
    inputs: parseCliInputs(unsignedTx.inputs),
    collateralInputs: [],
    outputs: parseCliOutputs(unsignedTx.outputs),
    change: [],
    certificates: parseCliCertificates(unsignedTx.certificates, stakingAddress),
    deposit: ZeroLovelace,
    additionalLovelaceAmount: ZeroLovelace,
    fee: parseCliFee(unsignedTx.fee) as Lovelace,
    baseFee: parseCliFee(unsignedTx.fee) as Lovelace,
    withdrawals: parseCliWithdrawals(unsignedTx.withdrawals, stakingAddress),
    protocolParameters,
  }
}

function parsePoolRegTxFile(fileContentStr: string) {
  const {cborHex, type: txBodyType} = JSONBig.parse(fileContentStr)
  if (!cborHex || !txBodyType) {
    throw new Error(
      'Invalid file structure. Make sure the JSON file has "type" and "cborHex" keys on the top level.'
    )
  }
  if (!Object.keys(cliTxBodyTypeToWitnessType).includes(txBodyType)) {
    throw new Error(`Unsupported transaction era, preferably use ${preferredCliTxBodyType} era.`)
  }
  return {cborHex, txBodyType}
}

const parseCliUnsignedTx = (cborHex: string) => {
  const unsignedTxDecoded = decode(cborHex)
  const unsignedTxParsed = parseUnsignedTx(unsignedTxDecoded)
  const deserializedTxValidationError = validatePoolRegUnsignedTx(unsignedTxParsed)
  if (deserializedTxValidationError) {
    throw deserializedTxValidationError
  }
  return {
    unsignedTxParsed,
    ttl: parseCliTtl(unsignedTxParsed.ttl),
    validityIntervalStart: parseCliValidityIntervalStart(unsignedTxParsed.validityIntervalStart),
  }
}

const transformSignatureToCliFormat = (witness: CborizedCliWitness, txBodyType: string) => {
  const type = cliTxBodyTypeToWitnessType[txBodyType]
  return {
    type,
    description: '',
    cborHex: encode(witness).toString('hex'),
  }
}

export {
  parsePoolRegTxFile,
  parseCliUnsignedTx,
  parseCliTtl,
  parseCliValidityIntervalStart,
  parseCliFee,
  unsignedPoolTxToTxPlan,
  transformSignatureToCliFormat,
}
