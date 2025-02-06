import assert from 'assert'

import {JsCryptoProvider, mnemonicToWalletSecretDef} from '@/crypto'
import {CabBackend} from '@/dataProvider'
import {AccountManager} from '@/wallet/'

import {accountManagerSettings} from '../common/account-manager-settings'
import mockNetwork from '../common/mock'
import {mockConfig} from '../common/mock-config'

const accountManagers = {} as {[key in keyof typeof accountManagerSettings]: AccountManager}

const initAccountManager = async (settings) => {
  const {secret, network, shouldExportPubKeyBulk} = settings
  const jsCryptoProviderConfig = {shouldExportPubKeyBulk}

  const walletSecretDef = await mnemonicToWalletSecretDef(secret)

  const cryptoProvider = new JsCryptoProvider({
    walletSecretDef,
    network,
    config: jsCryptoProviderConfig,
  })

  return new AccountManager({
    gapLimit: mockConfig.GAP_LIMIT,
    cryptoProvider,
    dataProvider: new CabBackend(mockConfig.CAB_BACKEND_URL, network.name),
  })
}

describe('Account manager', () => {
  let mockNet

  before(async () => {
    mockNet = mockNetwork()
    mockNet.mockFilterUsedAddressesEndpoint()
    mockNet.mockUtxoEndpoint()

    await Promise.all(
      Object.entries(accountManagerSettings).map(async ([name, setting]) => {
        accountManagers[name] = await initAccountManager(setting)
      })
    )
  })

  describe('Account discovery', () => {
    Object.entries(accountManagerSettings).forEach(([name, setting]) =>
      it(`should discover the right amount of accounts ${name}`, async () => {
        const accountManager = accountManagers[name]
        const accounts = await accountManager.discoverAccounts(setting.maxAccountIndex)
        assert.equal(accounts.length, setting.expectedNumberOfDiscoveredAccounts)
      })
    )
  })

  after(() => {
    mockNet.clean()
  })
})
