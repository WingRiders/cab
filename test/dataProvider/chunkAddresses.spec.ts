import assert from 'assert'

import {chunkAddresses} from '@/dataProvider/chunkAddresses'

describe('chunkAddresses', () => {
  it('handles an empty array', () => {
    const addresses: string[] = []
    const maxLength = 10

    const result = chunkAddresses(addresses, maxLength)

    assert.deepEqual(result, [])
  })

  it('does not split if all addresses fit within the maxLength', () => {
    const addresses = ['addr1', 'addr2']
    const maxLength = 20 // High enough limit to fit all addresses in one chunk

    const result = chunkAddresses(addresses, maxLength)

    assert.deepEqual(result, [['addr1', 'addr2']])
  })

  it('splits addresses correctly when the total length exceeds the maxLength', () => {
    const addresses = ['addr1', 'addr2', 'addr3', 'addr4']
    const maxLength = 15 // A limit that should split the array after two addresses

    const result = chunkAddresses(addresses, maxLength)

    assert.deepEqual(result, [
      ['addr1', 'addr2'],
      ['addr3', 'addr4'],
    ])
  })

  it('throws if the address is longer than maxLength', () => {
    const addresses = ['addr_long']
    const maxLength = 5
    assert.throws(() => chunkAddresses(addresses, maxLength))
  })

  it('returns single address matching exactly the size limit', () => {
    const addresses = ['addr_long']
    const maxLength = 9

    const result = chunkAddresses(addresses, maxLength)

    assert.deepEqual(result, [['addr_long']])
  })
})
