import assert from 'assert'
import fetchMock from 'fetch-mock'
import {createStakePoolDataProviderFromCexplorer} from '@/dataProviders/stakePools'
import {Stakepool} from '@/types'

import mockCexplorerPoolListResponse from './data/cexplorerPoolListResponse.json'
import {it} from 'mocha'

describe('StakepoolProvider', () => {
  it('Correctly loads stakepool data from cexplorer', async () => {
    fetchMock.mock(
      'https://preprod-js.cexplorer.io/api-static/pool/list.json',
      mockCexplorerPoolListResponse
    )

    const stakepoolDataProvider = await createStakePoolDataProviderFromCexplorer(
      'https://preprod-js.cexplorer.io'
    )

    assert.equal(
      [...stakepoolDataProvider.getStakepools()].length,
      20,
      'Incorrect number of total pools'
    )

    assert.deepStrictEqual<Stakepool>(
      stakepoolDataProvider.getPoolInfoByPoolHash(
        '5cb14d2c1eeb6daace6057dbc8a6b3bea06b06f7dcf32ff35ee1bddc'
      ),
      {
        pledge: '1000000000000',
        margin: 5,
        fixedCost: '340000000',
        url: 'https://preprod.cexplorer.io/pool/pool1tjc56tq7adk64nnq2ldu3f4nh6sxkphhmnejlu67ux7acq8y7rx',
        name: 'PSILOBYTE TN',
        ticker: 'PSBT',
        homepage:
          'https://preprod.cexplorer.io/pool/pool1tjc56tq7adk64nnq2ldu3f4nh6sxkphhmnejlu67ux7acq8y7rx',
        poolHash: '5cb14d2c1eeb6daace6057dbc8a6b3bea06b06f7dcf32ff35ee1bddc',
      },
      'Pool info for pool 5cb14d2c1eeb6daace6057dbc8a6b3bea06b06f7dcf32ff35ee1bddc not correct'
    )

    assert.deepStrictEqual<{poolHash: string; name: string}[]>(
      stakepoolDataProvider.getPoolInfoByTicker('APEX').map(({poolHash, name}) => ({poolHash, name})),
      [
        {
          poolHash: '7facad662e180ce45e5c504957cd1341940c72a708728f7ecfc6e349',
          name: 'Apex Cardano Pool',
        },
        {
          poolHash: '64d60fc4972085b884f5d6db08c67be08517c873a692c935b1bdf85e',
          name: 'Apex Cardano Pool Two',
        },
      ],
      'Pool infos for duplicate ticker APEX not correct'
    )
  })
})
