import assert from 'assert'

import {AddressManager} from '@/account'
import {JsCryptoProvider, mnemonicToWalletSecretDef} from '@/crypto'
import {CabBackend} from '@/dataProvider'
import {Network} from '@/types'

import {accountSettings} from '../common/account-settings'
import mockNetwork from '../common/mock'
import {mockConfig} from '../common/mock-config'

type InitAddressManagerParams = {
  accountIndex: number
  shouldExportPubKeyBulk: boolean
  network: Network
  secret: string
}

const initAddressManager = async ({
  accountIndex,
  shouldExportPubKeyBulk,
  network,
  secret,
}: InitAddressManagerParams) => {
  const cryptoProvider = new JsCryptoProvider({
    walletSecretDef: await mnemonicToWalletSecretDef(secret),
    network,
    config: {shouldExportPubKeyBulk},
  })
  return new AddressManager({
    accountIndex,
    cryptoProvider,
    dataProvider: new CabBackend(mockConfig.CAB_BACKEND_URL, network.name),
    gapLimit: mockConfig.GAP_LIMIT,
    stakeKeyHashesToDerive: 1,
  })
}

describe('Address manager', () => {
  let mockNet

  before(async () => {
    mockNet = mockNetwork()
    mockNet.mockFilterUsedAddressesEndpoint()
  })

  describe('Address derivation shelley', () => {
    Object.entries(accountSettings).forEach(([name, settings]) =>
      it(`should derive the right sequence of addresses with account ${name}`, async () => {
        const addressManager = await initAddressManager(settings)
        const walletAddresses = await addressManager.discoverAddresses()
        const baseInternalAddresses = walletAddresses.baseInternal.map(({address}) => address)
        const baseExternalAddresses = walletAddresses.baseExternal.map(({address}) => address)
        assert.equal(JSON.stringify(baseInternalAddresses), JSON.stringify(settings.internalAddresses))
        assert.equal(JSON.stringify(baseExternalAddresses), JSON.stringify(settings.externalAddresses))
        assert.equal(walletAddresses.stakingAddress, settings.stakingAddress)
      })
    )
  })

  after(() => {
    mockNet.clean()
  })
})
