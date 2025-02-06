import {ExecutionUnits} from '@cardano-ogmios/schema'
import {AddressTypes, getAddressType} from 'cardano-crypto.js'

import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {bechAddressToHex, isShelleyFormat} from '@/ledger/address'
import {
  Address as BechAddress,
  BigNumber,
  HexString,
  PubKeyHash,
  ScriptHash,
  StakingHash as StakingHashType,
  TxDatum,
  TxRedeemerTag,
} from '@/types'

import {BaseDatumConstr} from './BaseDatumConstr'
import {assertTxDatumConstr, asTxDatumConstr} from './transform'

type MaybeDecoder<T extends TxDatum> = (data: any) => T

export class Unit extends BaseDatumConstr {
  static readonly CONSTR = 0
  constructor() {
    super(Unit.CONSTR, [])
  }

  static decodeSchema(data: any): Unit {
    asTxDatumConstr({data, constr: Unit.CONSTR, requiredLength: 0, name: 'Unit'})
    return new Unit()
  }
}

export class EmptyRedeemer extends Unit {}

// ex units used if the real ex units are injected in getEvaluatedTxPlan
export const EMPTY_TX_EX_UNITS: ExecutionUnits = {memory: 0, cpu: 0}

export const emptyMintRedeemer = {
  tag: TxRedeemerTag.MINT,
  data: new EmptyRedeemer(),
  exUnits: EMPTY_TX_EX_UNITS,
} as const

export abstract class Maybe<_T> extends BaseDatumConstr {
  static decodeSchema<V extends TxDatum>(data: any, decoder: MaybeDecoder<V>): Maybe<V> {
    assertTxDatumConstr(data, 'Maybe')
    switch (data.i) {
      case Just.CONSTR:
        return Just.decodeSchema(data, decoder)
      case Nothing.CONSTR:
        return Nothing.decodeSchema(data)
      default:
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
          message: 'Maybe: unknown type',
        })
    }
  }
}

export class Just<T extends TxDatum> extends Maybe<T> {
  static readonly CONSTR = 0

  constructor(public readonly value: T) {
    super(Just.CONSTR, [value])
  }

  static decodeSchema<V extends TxDatum>(data: any, decoder: MaybeDecoder<V>): Just<V> {
    const dataConstr = asTxDatumConstr({
      data,
      constr: Just.CONSTR,
      requiredLength: 1,
      name: 'Just',
    })
    const value = decoder(dataConstr.data[0])
    return new Just(value)
  }
}

export class Nothing<T extends TxDatum> extends Maybe<T> {
  static readonly CONSTR = 1

  constructor() {
    super(Nothing.CONSTR, [])
  }

  static decodeSchema<V extends TxDatum>(data: any): Nothing<V> {
    // asserts that the type is Nothing
    const _dataConstr = asTxDatumConstr({
      data,
      constr: Nothing.CONSTR,
      requiredLength: 0,
      name: 'Nothing',
    })
    return new Nothing()
  }
}

export class AssetClass extends BaseDatumConstr {
  static readonly CONSTR = 0

  constructor(public readonly policyId: HexString, public readonly assetName: HexString) {
    super(AssetClass.CONSTR, [Buffer.from(policyId, 'hex'), Buffer.from(assetName, 'hex')])
  }

  static decodeSchema(data: any): AssetClass {
    const dataConstr = asTxDatumConstr({
      data,
      requiredLength: 2,
      constr: AssetClass.CONSTR,
      name: 'AssetClass',
    })

    const policyId = (dataConstr.data[0] as Buffer).toString('hex')
    const assetName = (dataConstr.data[1] as Buffer).toString('hex')

    return new AssetClass(policyId, assetName)
  }
}

export class AdaAssetClass extends AssetClass {
  constructor() {
    super('', '')
  }
}

export type POSIXTime = number // time in milliseconds since POSIX start

// Script runtime representation of a Digest SHA256.
// newtype ValidatorHash = ValidatorHash BuiltinByteString
export type ValidatorHash = HexString

export abstract class AddressCredential extends BaseDatumConstr {
  static decodeSchema(data: any): AddressCredential {
    assertTxDatumConstr(data, 'SpendingCredential')

    switch (data.i) {
      case PubKeyCredential.CONSTR:
        return PubKeyCredential.decodeSchema(data)
      case ScriptCredential.CONSTR:
        return ScriptCredential.decodeSchema(data)
      default:
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
          message: 'AddressCredentials: unknown credential type',
        })
    }
  }
}

const KEY_HASH_LENGTH = 28

export class PubKeyCredential extends AddressCredential {
  static readonly CONSTR = 0

  constructor(public readonly pubKeyHash: PubKeyHash) {
    super(PubKeyCredential.CONSTR, [Buffer.from(pubKeyHash, 'hex')])
  }

  static decodeSchema(data: any): PubKeyCredential {
    const dataConstr = asTxDatumConstr({
      data,
      constr: PubKeyCredential.CONSTR,
      requiredLength: 1,
      name: 'PubKeyCredential',
    })
    if ((dataConstr.data[0] as Buffer).length !== KEY_HASH_LENGTH) {
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
        message: 'PubKeyCredential: invalid pubKeyHash length',
      })
    }
    const pubKeyHash = (dataConstr.data[0] as Buffer).toString('hex') as PubKeyHash
    return new PubKeyCredential(pubKeyHash)
  }
}

export class StakingHashCredential extends BaseDatumConstr {
  static readonly CONSTR = 0

  constructor(public readonly stakingHash: StakingHashType) {
    super(PubKeyCredential.CONSTR, [Buffer.from(stakingHash, 'hex')])
  }

  static decodeSchema(data: any): StakingHashCredential {
    const dataConstr = asTxDatumConstr({
      data,
      constr: StakingHashCredential.CONSTR,
      requiredLength: 1,
      name: 'StakingHashCredential',
    })
    if ((dataConstr.data[0] as Buffer).length !== KEY_HASH_LENGTH) {
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
        message: 'StakingHashCredential: invalid stakingHash length',
      })
    }
    const stakingHash = (dataConstr.data[0] as Buffer).toString('hex') as StakingHashType
    return new StakingHashCredential(stakingHash)
  }
}

export class ScriptCredential extends AddressCredential {
  static readonly CONSTR = 1

  constructor(public readonly scriptHash: ScriptHash) {
    super(ScriptCredential.CONSTR, [Buffer.from(scriptHash, 'hex')])
  }

  static decodeSchema(data: any): ScriptCredential {
    const dataConstr = asTxDatumConstr({
      data,
      constr: ScriptCredential.CONSTR,
      requiredLength: 1,
      name: 'ScriptCredential',
    })
    if ((dataConstr.data[0] as Buffer).length !== KEY_HASH_LENGTH) {
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
        message: 'ScriptCredential: invalid scriptHash length',
      })
    }
    const scriptHash = (dataConstr.data[0] as Buffer).toString('hex') as ScriptHash
    return new ScriptCredential(scriptHash)
  }
}

export abstract class StakingCredential extends BaseDatumConstr {
  static decodeSchema(data: any): StakingCredential {
    assertTxDatumConstr(data, 'StakingCredential')
    switch (data.i) {
      case StakingHash.CONSTR:
        return StakingHash.decodeSchema(data)
      case StakingPtr.CONSTR:
        return StakingPtr.decodeSchema(data)
      default:
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
          message: 'StakingCredential: unknown staking type',
        })
    }
  }
}

export class StakingHash extends StakingCredential {
  static readonly CONSTR = 0

  constructor(public readonly credential: AddressCredential) {
    super(StakingHash.CONSTR, [credential])
  }

  static decodeSchema(data: any): StakingHash {
    const dataConstr = asTxDatumConstr({
      data,
      constr: StakingHash.CONSTR,
      requiredLength: 1,
      name: 'StakingHash',
    })
    const credential = AddressCredential.decodeSchema(dataConstr.data[0])
    return new StakingHash(credential)
  }
}

export class StakingPtr extends StakingCredential {
  static readonly CONSTR = 1

  constructor(
    public readonly blockIndex: BigNumber,
    public readonly txIndex: BigNumber,
    public readonly certificateIndex: BigNumber
  ) {
    super(StakingPtr.CONSTR, [blockIndex, txIndex, certificateIndex])
  }

  static decodeSchema(data: any): StakingPtr {
    const dataConstr = asTxDatumConstr({
      data,
      constr: StakingPtr.CONSTR,
      requiredLength: 3,
      name: 'StakingPtr',
    })
    const blockIndex = new BigNumber(dataConstr.data[0] as BigNumber.Value)
    const txIndex = new BigNumber(dataConstr.data[1] as BigNumber.Value)
    const certificateIndex = new BigNumber(dataConstr.data[2] as BigNumber.Value)
    return new StakingPtr(blockIndex, txIndex, certificateIndex)
  }
}

export class Address extends BaseDatumConstr {
  static readonly CONSTR = 0

  constructor(
    public readonly addressCredential: AddressCredential,
    public readonly addressStakingCredential: Maybe<StakingCredential>
  ) {
    super(Address.CONSTR, [addressCredential, addressStakingCredential])
  }

  static fromAddress(address: BechAddress): Address {
    if (!isShelleyFormat(address)) throw new Error('Bad address')
    return Address.fromAddressHex(bechAddressToHex(address))
  }

  static fromAddressHex(address: HexString): Address {
    const buffer = Buffer.from(address, 'hex')
    const spendingHash = (buffer: Buffer) => buffer.slice(1, 29).toString('hex')
    const stakingPart = (buffer: Buffer) => buffer.slice(29).toString('hex')
    switch (getAddressType(buffer)) {
      case AddressTypes.BASE:
        return new Address(
          new PubKeyCredential(spendingHash(buffer) as PubKeyHash),
          new Just(new StakingHash(new PubKeyCredential(stakingPart(buffer) as PubKeyHash)))
        )
      case AddressTypes.BASE_KEY_SCRIPT:
        return new Address(
          new PubKeyCredential(spendingHash(buffer) as PubKeyHash),
          new Just(new StakingHash(new ScriptCredential(stakingPart(buffer) as ScriptHash)))
        )
      case AddressTypes.BASE_SCRIPT_KEY:
        return new Address(
          new ScriptCredential(spendingHash(buffer) as ScriptHash),
          new Just(new StakingHash(new PubKeyCredential(stakingPart(buffer) as PubKeyHash)))
        )
      case AddressTypes.BASE_SCRIPT_SCRIPT:
        return new Address(
          new ScriptCredential(spendingHash(buffer) as ScriptHash),
          new Just(new StakingHash(new ScriptCredential(stakingPart(buffer) as ScriptHash)))
        )
      case AddressTypes.ENTERPRISE:
        return new Address(new PubKeyCredential(spendingHash(buffer) as PubKeyHash), new Nothing())
      case AddressTypes.ENTERPRISE_SCRIPT:
        return new Address(new ScriptCredential(spendingHash(buffer) as ScriptHash), new Nothing())
      case AddressTypes.POINTER:
      case AddressTypes.POINTER_SCRIPT:
        // we would need to decode the 3 integers
        throw new Error('Not implemented')
      default:
        throw new Error('Unfamiliar address type')
    }
  }

  static decodeSchema(data: any): Address {
    const dataConstr = asTxDatumConstr({
      data,
      constr: Address.CONSTR,
      requiredLength: 2,
      name: 'Address',
    })

    const addressCredential = AddressCredential.decodeSchema(dataConstr.data[0])
    const addressStakingCredential = Maybe.decodeSchema(
      dataConstr.data[1],
      StakingCredential.decodeSchema
    )

    return new Address(addressCredential, addressStakingCredential)
  }
}
