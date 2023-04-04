import assert from 'assert'
import * as cbor from 'borc'

import {blake2b} from 'cardano-crypto.js'
import {Address, BIP32Path} from '@/types'
import {CatalystVotingRegistrationData, TxPlanMetadata} from '@/types/txPlan'
import {encodeMetadata} from '@/ledger/transaction/metadata/encodeMetadata'

describe('MetadataCborizers', () => {
  const txVotingRegistration: CatalystVotingRegistrationData = {
    votingPubKey: 'B723DBF81ABD5BEEF3040796231E8D5F32C70B59059F7C70DF4B406993500885',
    stakePubKey: 'E55E62895B4C7D3334C6045D4F1442FBE02735C00D4CCA95281D7054AE1CD4EE',
    nonce: 65210349,
    rewardDestinationAddress: {
      address: 'addr_test1ursxqzk5nj9q3fqpmxz6mlxvfrxqckkvfcjup9karlcwetgekjk8m' as Address,
      stakingPath: [2147485500, 2147485463, 2147483648, 0, 0] as BIP32Path,
    },
  }
  const txVotingSignature =
    'c982c86d1bfa93f85bc76fc578dc399696ef3d4080f96f901f205b9cfeb7a3ae71056d3bdac5a5ffda763e5ce8cee0b681de4b66cc8534cb5b2516128a0cf70b'
  const txMessage = [
    "Test message, but so long we'll need to split it into multiple chunks. Given this is the only standard we are given for messages, we might as well test for it",
  ]

  it('should add txVotingRegistration and txVotingSignature to txMetadata', () => {
    // from https://testnet.cardanoscan.io/transaction/e952008cf652c93912a9fa9dfa1ac79c905f5997566a8c3c08a441bdb95d5c2c
    const CBORIZED_VOTING =
      'a219ef64a4015820b723dbf81abd5beef3040796231e8d5f32c70b59059f7c70df4b406993500885025820e55e62895b4c7d3334c6045d4f1442fbe02735c00d4cca95281d7054ae1cd4ee03581de0e0600ad49c8a08a401d985adfccc48cc0c5acc4e25c096dd1ff0ecad041a03e307ed19ef65a1015840c982c86d1bfa93f85bc76fc578dc399696ef3d4080f96f901f205b9cfeb7a3ae71056d3bdac5a5ffda763e5ce8cee0b681de4b66cc8534cb5b2516128a0cf70b'
    // Eternl's HASH doesn't match the hash we get by hashing the correct cbor. Probably related to some element order in CBOR I'd guess.
    // const HASH_TEST_VOTING = '919da5d679cd96b0690eed301de073eabedaae90b6965e9659363a8092c24efa'
    const HASH_TEST_VOTING = '803c0b4d8e26c02d2af041723d9968e2c5e6208ca64e62cbb9da9dcc5cb9b997'

    const votingMetadata: TxPlanMetadata = {
      votingData: txVotingRegistration,
      votingSignature: txVotingSignature,
    }
    const encodedMetadata = encodeMetadata(votingMetadata)
    const encodedVoting = cbor.encode(encodedMetadata)
    const hashVoting = blake2b(encodedVoting, 32).toString('hex')

    assert(encodedMetadata?.get(61284))
    assert(encodedMetadata?.get(61285))
    assert(encodedVoting.toString('hex') === CBORIZED_VOTING)
    assert(hashVoting === HASH_TEST_VOTING)
  })
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
