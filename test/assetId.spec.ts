import assert from 'assert'
import {assetFromId, assetId} from '../src/helpers'

describe('Asset id', () => {
  it('should parse asset from asset id', () => {
    const assets = [
      {
        policyId: 'c0ee29a85b13209423b10447d3c2e6a50641a15c57770e27cb9d5073',
        assetName: '57696e67526964657273',
      },
      {
        policyId: '8e51398904a5d3fc129fbf4f1589701de23c7824d5c90fdb9490e15a',
        assetName: '434841524c4933',
      },
      {
        policyId: '5dac8536653edc12f6f5e1045d8164b9f59998d3bdc300fc92843489',
        assetName: '4e4d4b52',
      },
      {
        policyId: 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880',
        assetName: '69425443',
      },
      {
        policyId: 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880',
        assetName: '69555344',
      },
    ]
    assets.forEach((a) => assert.deepEqual(assetFromId(assetId(a)), a))
  })
})
