import assert from 'assert'
import {encode} from 'borc'
import {omit} from 'lodash'

import {Account} from '@/account'
import {JsCryptoProvider, mnemonicToWalletSecretDef} from '@/crypto'
import {CabBackend} from '@/dataProvider'
import {getTxPlan, prepareTxAux} from '@/ledger/transaction'

import {accountSettings} from '../../common/account-settings'
import mockNetwork from '../../common/mock'
import {mockConfig} from '../../common/mock-config'
import {transactionSettings} from '../../common/tx-settings'
import {protocolParameters} from '../../data/protocolParameters'

const accounts = {} as {[key in keyof typeof accountSettings]: Account}

const initAccount = async (settings) => {
  const {network, secret, accountIndex, shouldExportPubKeyBulk} = settings
  const jsCryptoProviderConfig = {shouldExportPubKeyBulk}

  const walletSecretDef = await mnemonicToWalletSecretDef(secret)

  const cryptoProvider = new JsCryptoProvider({
    walletSecretDef,
    network,
    config: jsCryptoProviderConfig,
  })
  await cryptoProvider.load()

  return new Account({
    gapLimit: mockConfig.GAP_LIMIT,
    cryptoProvider,
    dataProvider: new CabBackend(mockConfig.CAB_BACKEND_URL, network.name),
    accountIndex,
    stakeKeyHashesToDerive: 1,
  })
}

describe('Account', () => {
  before(async () => {
    const mockNet = mockNetwork()
    mockNet.mockFilterUsedAddressesEndpoint()
    mockNet.mockUtxoEndpoint()

    await Promise.all(
      Object.entries(accountSettings).map(async ([name, setting]) => {
        accounts[name] = await initAccount(setting)
      })
    )
  })

  describe('Tx plan', () => {
    Object.entries(transactionSettings).forEach(([name, setting]) =>
      it(`should create the right tx plan for tx with ${name}`, async () => {
        const account = await accounts.ShelleyAccount0.load()
        const txPlanResult = getTxPlan(setting.args, account.getUtxos(), account.getChangeAddress())
        const actual = omit(txPlanResult, ['txPlan.protocolParameters'])
        const expected = setting.txPlanResult
        assert.deepEqual(actual, expected)
      })
    )
  })

  describe('TxAux', () => {
    ;[...Object.entries(transactionSettings)].forEach(([name, setting]) =>
      it(`should calculate the right tx hash for tx with ${name}`, () => {
        const txAux = prepareTxAux({...setting.txPlanResult.txPlan, protocolParameters}, setting.ttl)
        const txHash = txAux.getId()
        assert.deepEqual(txHash, setting.txHash)
      })
    )
  })

  describe('Cbor', () => {
    ;[...Object.entries(transactionSettings)]
      .filter(([_name, setting]) => setting.cborHex)
      .forEach(([name, setting]) =>
        it(`should calculate the right tx hash for tx with ${name}`, () => {
          const txAux = prepareTxAux(
            {
              ...setting.txPlanResult.txPlan,
              protocolParameters: setting.args.protocolParameters,
            },
            setting.ttl
          )
          const cborHex = encode(txAux).toString('hex')
          assert.deepEqual(cborHex, setting.cborHex)
        })
      )
  })

  describe('args to signed', () => {
    ;[...Object.entries(transactionSettings)]
      .filter(([_name, setting]) => setting.signedTxBody)
      .forEach(([name, setting]) =>
        it(`should successfully sign a tx ${name}`, async () => {
          const account = await accounts.ShelleyAccount0.load()
          const txPlanResult = getTxPlan(
            {...setting.args},
            account.getUtxos(),
            account.getChangeAddress()
          )
          assert.equal(txPlanResult?.success, true)
          if (txPlanResult?.success === true) {
            const txAux = prepareTxAux(txPlanResult.txPlan, setting.ttl)
            const {txBody, txHash} = await account.signTxAux(txAux)
            assert.deepEqual(txBody, setting.signedTxBody)
            assert.deepEqual(txHash, setting.txHash)
          }
        })
      )
  })
})
