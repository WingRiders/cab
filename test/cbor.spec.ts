import {equal, strictEqual, throws} from 'assert'
import {encode} from 'borc'
import {BigNumber} from 'bignumber.js'

import {CborIndefiniteLengthArray} from '../src/ledger/transaction/cbor/CborIndefiniteLengthArray'
import {CborInt64} from '../src/ledger/transaction/cbor/CborInt64'
import * as api from '@/dappConnector'
import {cborizeNormalizedTxValue} from '@/ledger/transaction/cbor/cborize'

describe('CBOR', () => {
  const encodeHex = (obj) => encode(obj).toString('hex')

  describe('encoding of indefinite length arrays', () => {
    it('should properly encode empty array', () => {
      const arr = new CborIndefiniteLengthArray([])
      equal(encodeHex(arr), '9fff')
    })

    it('should properly encode short array', () => {
      const arr = new CborIndefiniteLengthArray([1, 2, 3])
      equal(encodeHex(arr), '9f010203ff')
    })

    it('should properly encode long array', () => {
      const arr = new CborIndefiniteLengthArray([...Array(35).keys()])
      equal(
        encodeHex(arr),
        '9f000102030405060708090a0b0c0d0e0f101112131415161718181819181a181b181c181d181e181f182018211822ff'
      )
    })
  })

  describe('Int64', () => {
    it('large numbers', () => {
      const bigInt = new CborInt64(new BigNumber('9223372036854675807'))
      equal(encodeHex(bigInt), '1b7ffffffffffe795f')
    })

    it('negative large numbers', () => {
      const bigInt = new CborInt64(new BigNumber('-9223372036854675807'))
      equal(encodeHex(bigInt), '3b7ffffffffffe795e')
    })

    it('0', () => {
      const bigInt = new CborInt64(new BigNumber('0'))
      equal(encodeHex(bigInt), '00')
    })

    it('small int', () => {
      const bigInt = new CborInt64(new BigNumber('4'))
      equal(encodeHex(bigInt), '04')
    })

    it('negative small int', () => {
      const bigInt = new CborInt64(new BigNumber('-4'))
      equal(encodeHex(bigInt), '23')
    })

    it('medium large int', () => {
      const bigInt = new CborInt64(new BigNumber('63890'))
      equal(encodeHex(bigInt), '19f992')
    })

    it('medium negative int', () => {
      const bigInt = new CborInt64(new BigNumber('-23245'))
      equal(encodeHex(bigInt), '395acc')
    })

    it('MAX_SAFE_ITNEGER', () => {
      const bigInt = new CborInt64(new BigNumber(Number.MAX_SAFE_INTEGER - 1))
      equal(encodeHex(bigInt), '1b001ffffffffffffe')
    })

    it('MIN_SAFE_ITNEGER', () => {
      const bigInt = new CborInt64(new BigNumber(Number.MIN_SAFE_INTEGER))
      equal(encodeHex(bigInt), '3b001ffffffffffffe')
    })
  })

  describe('encode api.Value', () => {
    it('994.649418 ADA', () => {
      const value = new Map([
        ['', new Map([['', new BigNumber(new BigNumber(994649418))]])],
      ]) as api.Value
      // hex taken from Nami wallet
      strictEqual(encodeHex(cborizeNormalizedTxValue(value)), '1a3b49254a')
    })

    it('997.093861 ADA + 45.805 wDOGE', () => {
      const value = new Map([
        ['', new Map([['', new BigNumber(997093861)]])],
        [
          '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198',
          new Map([[Buffer.from('wDOGE').toString('hex'), new BigNumber(45805)]]),
        ],
      ]) as api.Value
      strictEqual(
        encodeHex(cborizeNormalizedTxValue(value)),
        // hex taken from Nami wallet
        '821a3b6e71e5a1581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a14577444f474519b2ed'
      )
    })

    it('Malformed Value - multiple entries under ADA policy id', () => {
      const value = new Map([
        [
          '',
          new Map([
            ['', new BigNumber(100)],
            [Buffer.from('wBTC').toString('hex'), new BigNumber(1000)],
          ]),
        ],
      ]) as api.Value
      throws(() => cborizeNormalizedTxValue(value))
    })
  })
})
