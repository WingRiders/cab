import {BigNumber} from 'bignumber.js'
import JSONBig from 'json-bigint'

import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {toType} from '@/ledger/transaction/cbor/cborTypes'
import {TxDatum, TxDatumConstr, TxSimpleDatum} from '@/types/transaction'

import {BaseDatumConstr} from './BaseDatumConstr'

const SchemaJSON = JSONBig({constructorAction: 'preserve'})

function _parseFromSchemaJson(data: any): TxDatum {
  if (typeof data === 'undefined') {
    throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
      message: `undefined fields not supported`,
    })
  }
  if (typeof data.constructor === 'number') {
    // DATA constructors

    if (toType(data.fields) !== 'Array') {
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
        message: `fields not an array ${SchemaJSON.stringify(data)}`,
      })
    }
    return new BaseDatumConstr(
      data.constructor,
      data.fields.map((field) => _parseFromSchemaJson(field))
    )
  } else {
    // BASE types
    const [type, value] = Object.entries(data)[0]
    switch (type) {
      case 'bytes': // this can be bytes or string as well
        return Buffer.from(value as string, 'hex')
      case 'int':
        return BigNumber.isBigNumber(value) ? (value as BigNumber) : (value as number)
      case 'map': {
        if (toType(value) !== 'Array') {
          throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
            message: 'map entries not an array',
          })
        }
        const entries: any[] = value as any[]
        if (entries.length > 0 && (entries[0].k === undefined || entries[0].v === undefined)) {
          throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
            message: "map entries doesn't contain key-value pairs",
          })
        }
        return new Map<TxDatum, TxDatum>(
          entries.map((entry) => [_parseFromSchemaJson(entry.k), _parseFromSchemaJson(entry.v)])
        )
      }
      case 'list': {
        const entries: any[] = value as any[]
        return entries.map(_parseFromSchemaJson)
      }
      default: {
        throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
          message: 'unknown type',
        })
      }
    }
  }
}

export function parseFromSchemaJson(json: string): TxDatum {
  const data = SchemaJSON.parse(json)
  return _parseFromSchemaJson(data)
}

function _toSchemaJson(data: TxDatum): any {
  const mapEntries = (entries: [TxDatum, TxDatum][]) =>
    entries.map((entry) => ({
      k: _toSchemaJson(entry[0]),
      v: _toSchemaJson(entry[1]),
    }))

  const type = toType(data)
  switch (type) {
    case 'String':
      return {bytes: Buffer.from(data as string).toString('hex')}
    case 'Uint8Array': // Buffer
      return {bytes: (data as Buffer).toString('hex')}
    case 'Map':
      return {map: mapEntries(Array.from((data as Map<TxDatum, TxDatum>).entries()))}
    case 'Number':
      return {int: data}
    case 'Array':
      return {list: (data as Array<TxDatum>).map((elem) => _toSchemaJson(elem))}
    case 'Object': {
      if (BigNumber.isBigNumber(data)) {
        const bn = data as BigNumber
        return {int: bn}
      } else if ((data as TxDatumConstr).__typeConstr) {
        const dataConstr = data as TxDatumConstr
        return {fields: dataConstr.data.map((elem) => _toSchemaJson(elem)), constructor: dataConstr.i}
      } else if ((data as TxSimpleDatum).__simpleDatum) {
        return _toSchemaJson((data as TxSimpleDatum).data)
      } else {
        // sort alphabetically
        const entries = Object.entries(data)
        entries.sort((a, b) => Buffer.from(a[0]).compare(Buffer.from(b[0])))
        return {map: mapEntries(entries)}
      }
    }
    default:
      throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
        message: `type ${type} to JSON not supported`,
      })
  }
}

export function assertTxDatumConstr(data: any, name: string) {
  if (!(data as TxDatumConstr).__typeConstr) {
    throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
      message: `${name} bad schema json`,
    })
  }
}

export function asTxDatumConstr({
  data,
  constr,
  requiredLength,
  name,
}: {
  data: any
  constr: number
  requiredLength: number
  name: string
}): TxDatumConstr {
  assertTxDatumConstr(data, name)
  const dataConstr = data as TxDatumConstr
  if (dataConstr.i !== constr || dataConstr.data.length !== requiredLength) {
    throw new CabInternalError(CabInternalErrorReason.DatumTypeNotSupported, {
      message: `${name} Expected ${constr} but was ${dataConstr.i}`,
    })
  }
  return dataConstr
}

export function toSchemaJson(data: TxDatum): string {
  return SchemaJSON.stringify(_toSchemaJson(data))
}
