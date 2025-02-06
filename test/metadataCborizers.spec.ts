import assert from 'assert'
import * as cbor from 'borc'
import {blake2b} from 'cardano-crypto.js'

import {encodeMetadata} from '@/ledger/transaction/metadata/encodeMetadata'
import {TxPlanMetadata} from '@/types/txPlan'

describe('MetadataCborizers', () => {
  const txMessage = [
    "Test message, but so long we'll need to split it into multiple chunks. Given this is the only standard we are given for messages, we might as well test for it",
  ]

  it('should add txMessage to txMetadata', () => {
    // Taken from this Eternl-made testnet transaction: 0c38697bff3d81aa5e37179d8f3d9a7e8041c786300678fbaf56857767d46224
    const CBORIZED_TEST_MESSAGE =
      'a11902a2a1636d736783784054657374206d6573736167652c2062757420736f206c6f6e67207765276c6c206e65656420746f2073706c697420697420696e746f206d756c7469706c652063784068756e6b732e20476976656e207468697320697320746865206f6e6c79207374616e646172642077652061726520676976656e20666f72206d65737361676573781e2c207765206d696768742061732077656c6c207465737420666f72206974'
    const HASH_TEST_MESSAGE = '93b8836e062fb1c0397901d3180201f1b1ddd741b0ea8687b204f929a8cb0596'

    const compliantMessage: TxPlanMetadata = {message: txMessage}

    const cborizedTxMessageMetadata = encodeMetadata(compliantMessage)

    const encodedMessage = cbor.encode(cborizedTxMessageMetadata)
    const hashMessage = blake2b(encodedMessage, 32).toString('hex')

    assert(cborizedTxMessageMetadata?.get(674))
    assert(encodedMessage.toString('hex') === CBORIZED_TEST_MESSAGE)
    assert(hashMessage === HASH_TEST_MESSAGE)
  })
})
