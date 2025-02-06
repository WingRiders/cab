import {BigNumber} from 'bignumber.js'
import {Decoder, encode, Tagged} from 'borc'
import fromPairs from 'lodash/fromPairs'
import range from 'lodash/range'

import {MAX_INT64, MIN_INT64} from '@/constants'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {BaseDatumConstr} from '@/ledger/plutus/BaseDatumConstr'
import {TxDatum, TxDatumConstr, TxSimpleDatum} from '@/types/transaction'

import {CborDefiniteLengthArray} from './CborDefiniteLengthArray'
import {CborIndefiniteLengthArray} from './CborIndefiniteLengthArray'
import {CborInt64} from './CborInt64'
import {ARRAY_ENCODING, MT, SORT_ORDER, toType} from './cborTypes'

/**
 * Encodes script datum
 *
 * ⚠️⚠️⚠️⚠️⚠️⚠️
 * Objects - keys are treated as strings, if different type should be a key, use Map instead
 * Maps - keys are ordered according to the sort order defined in the constructor
 * ⚠️⚠️⚠️⚠️⚠️⚠️
 */

class CborizedTxDatumConstr {
  dataConstr: TxDatumConstr
  cborSortOrder: SORT_ORDER
  cborArrayEncoding: ARRAY_ENCODING

  constructor(
    data: TxDatumConstr,
    sortOrder = SORT_ORDER.ALPHABETICAL,
    arrayEncoding = ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE
  ) {
    this.dataConstr = data
    this.cborSortOrder = sortOrder
    this.cborArrayEncoding = arrayEncoding
  }

  getCborTag() {
    const i = this.dataConstr.i
    // copies the tagging logic from plutus
    // CDDL: https://github.com/input-output-hk/cardano-ledger/blob/2048cd4679ef3155d88a445e0f818abad09a0827/eras/alonzo/test-suite/cddl-files/alonzo.cddl#L287
    // code: https://github.com/input-output-hk/plutus/blob/4671f6b09586d9ce2063b5670121a922e7cdffbd/plutus-core/plutus-core/src/PlutusCore/Data.hs#L111
    if (0 <= i && i < 7) {
      return 121 + i
    } else if (7 <= i && i < 128) {
      return 1280 + i - 7
    } else {
      // TODO implement custom tags, not implemented yet
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {message: 'ConstrTag'})
    }
  }

  encodeCBOR(encoder: any) {
    if (this.cborArrayEncoding === ARRAY_ENCODING.ALWAYS_DEFINITE) {
      return encoder.pushAny(
        new Tagged(
          this.getCborTag(),
          new CborDefiniteLengthArray(
            this.dataConstr.data.map(
              (e: any) => new CborizedTxDatum(e, this.cborSortOrder, this.cborArrayEncoding)
            )
          ),
          null
        )
      )
    }
    if (
      this.cborArrayEncoding === ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE &&
      this.dataConstr.data.length === 0
    ) {
      return encoder.pushAny(new Tagged(this.getCborTag(), [], null))
    }
    return encoder.pushAny(
      new Tagged(
        this.getCborTag(),
        new CborIndefiniteLengthArray(
          this.dataConstr.data.map(
            (e: any) => new CborizedTxDatum(e, this.cborSortOrder, this.cborArrayEncoding)
          )
        ),
        null
      )
    )
  }
}

export class CborizedTxDatum {
  data: TxDatum
  sortOrder: SORT_ORDER
  arrayEncoding: ARRAY_ENCODING

  constructor(data: TxDatum, sortOrder = SORT_ORDER.ALPHABETICAL, arrayEncoding?: ARRAY_ENCODING) {
    this.data = data
    this.sortOrder = sortOrder
    this.arrayEncoding =
      (typeof data === 'object' && '__typeConstr' in data ? data.__cborArrayEncoding : arrayEncoding) ??
      ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE
  }

  _pushMapAlphabeticOrder(encoder: any) {
    const dataMap = this.data as Map<TxDatum, TxDatum>
    if (!encoder._pushInt(dataMap.size, MT.MAP)) {
      return false
    }

    // Sort keys based on alphabetical order
    const keys = Array.from(dataMap.keys()).sort()
    for (const key of keys) {
      if (!encoder.push(encode(new CborizedTxDatum(key, this.sortOrder, this.arrayEncoding)))) {
        return false
      }

      const datum = dataMap.get(key)
      if (!datum || !encoder.pushAny(new CborizedTxDatum(datum, this.sortOrder, this.arrayEncoding))) {
        return false
      }
    }
    return true
  }

  encodeCBOR(encoder: any) {
    const typ = toType(this.data)

    let success = false

    switch (typ) {
      case 'String':
        success = encoder.pushAny(Buffer.from(this.data as string))
        break
      case 'BigNumber': // ⚠️ This one is a weird one, BigNumber is actually an object
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {message: 'BigNumber'})
      case 'Object': {
        if (BigNumber.isBigNumber(this.data)) {
          if (this.data.lte(MAX_INT64) && this.data.gte(MIN_INT64)) {
            success = encoder.pushAny(new CborInt64(this.data))
          } else {
            success = encoder._pushBigNumber(encoder, this.data)
          }
        } else if ((this.data as TxDatumConstr).__typeConstr) {
          success = encoder.pushAny(
            new CborizedTxDatumConstr(this.data as TxDatumConstr, this.sortOrder, this.arrayEncoding)
          )
        } else if ((this.data as TxSimpleDatum).__simpleDatum) {
          success = encoder.pushAny(
            new CborizedTxDatum((this.data as TxSimpleDatum).data, this.sortOrder, this.arrayEncoding)
          )
        } else {
          success = encoder.pushAny(
            new CborizedTxDatum(new Map(Object.entries(this.data)), this.sortOrder, this.arrayEncoding)
          )
        }
        break
      }
      case 'Map': {
        if (this.sortOrder === SORT_ORDER.BORC_CANONICAL) {
          const mappedData = new Map(
            Array.from<[any, any]>((this.data as Map<TxDatum, TxDatum>).entries()).map((entry) => [
              new CborizedTxDatum(entry[0], this.sortOrder, this.arrayEncoding),
              new CborizedTxDatum(entry[1], this.sortOrder, this.arrayEncoding),
            ])
          )
          success = encoder.pushAny(mappedData)
        } else {
          success = this._pushMapAlphabeticOrder(encoder)
        }
        break
      }
      case 'BigInt':
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {message: 'BigInt'})
      case 'Array': {
        const arrayData = this.data as Array<TxDatum>
        if (this.arrayEncoding === ARRAY_ENCODING.ALWAYS_DEFINITE) {
          success = encoder.pushAny(
            new CborDefiniteLengthArray(
              (this.data as Array<TxDatum>).map(
                (e: any) => new CborizedTxDatum(e, this.sortOrder, this.arrayEncoding)
              )
            )
          )
        } else if (
          this.arrayEncoding === ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE &&
          arrayData.length === 0
        ) {
          success = encoder.push(Buffer.from('80', 'hex'))
        } else {
          success = encoder.pushAny(
            new CborIndefiniteLengthArray(
              (this.data as Array<TxDatum>).map(
                (e: any) => new CborizedTxDatum(e, this.sortOrder, this.arrayEncoding)
              )
            )
          )
        }
        break
      }
      default:
        success = encoder.pushAny(this.data)
    }
    return success
  }

  static decode(data: string | Buffer, enc: 'hex' | 'base64' = 'hex'): TxDatum {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, enc)
    // !assumes that all arrays have the same encoding
    const constrDatumArrayEncoding = getConstrDatumArrayEncoding(buffer)
    // copies the tagging logic from plutus
    // CDDL: https://github.com/input-output-hk/cardano-ledger/blob/2048cd4679ef3155d88a445e0f818abad09a0827/eras/alonzo/test-suite/cddl-files/alonzo.cddl#L287
    // code: https://github.com/input-output-hk/plutus/blob/4671f6b09586d9ce2063b5670121a922e7cdffbd/plutus-core/plutus-core/src/PlutusCore/Data.hs#L111
    const constrMapping = [
      ...range(0, 7).map((num) => [
        121 + num,
        (val) => new BaseDatumConstr(num, val, constrDatumArrayEncoding),
      ]),
      ...range(7, 128).map((num) => [
        1280 + num - 7,
        (val) => new BaseDatumConstr(num, val, constrDatumArrayEncoding),
      ]),
    ]
    const decoder = new Decoder({
      tags: fromPairs(constrMapping),
    })

    return decoder.decodeFirst(buffer)
  }
}

const getConstrDatumArrayEncoding = (datumBuffer: Buffer): ARRAY_ENCODING | undefined => {
  const arrayTag = datumBuffer.at(2)
  if (!arrayTag) return undefined
  if (arrayTag === 159) return ARRAY_ENCODING.ZERO_LENGTH_FOR_EMPTY_FOR_OTHER_INDEFINITE
  if (arrayTag >= 129 && arrayTag <= 151) return ARRAY_ENCODING.ALWAYS_DEFINITE
  return undefined
}
