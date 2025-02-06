import {Account} from '@/account'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {DataProvider} from '@/dataProvider'
import {HexString} from '@/types'
import {NetworkId} from '@/types/network'
import {CryptoProviderFeature} from '@/types/wallet'

import {AccountManager} from './AccountManager'

type WalletParams = {
  dataProvider: DataProvider
  cryptoProvider: ICryptoProvider
  gapLimit: number
}

/**
 * Wallet is responsible for discovering accounts and submitting transactions.
 *
 * @example
 * const wallet = new Wallet({dataProvider, cryptoProvider, gapLimit})
 * const account = await wallet.getOrLoadAccount(0)
 * const utxos = account.getUtxos()
 */
export class Wallet {
  private cryptoProvider: ICryptoProvider
  private dataProvider: DataProvider
  private accountManager: AccountManager

  constructor({cryptoProvider, dataProvider, gapLimit}: WalletParams) {
    this.cryptoProvider = cryptoProvider
    this.dataProvider = dataProvider

    this.accountManager = new AccountManager({
      cryptoProvider,
      dataProvider,
      gapLimit,
    })
  }

  /**
   * Discovers active accounts for this wallet.
   *
   * Account is considered active if it has been used at least once. That means
   * there is at least one used address for the account.
   *
   * Discovers up to `maxAccounts` accounts, defaulting to 20. The discovery
   * ends with the first inactive account.
   *
   * @param maxAccounts Maximum number of accounts to discover
   * @returns Promise of discovered accounts order by account index ascending
   */
  discoverAccounts({maxAccounts}: {maxAccounts: number} = {maxAccounts: 20}) {
    return this.accountManager.discoverAccounts(maxAccounts)
  }

  /**
   * Returns Account with loaded addresses and UTxOs
   * @param index
   * @param reloadAccountInfo Indicates if to reload account info (addresses) when initializing the account
   * @param reloadUtxos Indicates if to reload UTxOs when initializing the account
   * @param stakeKeyHashesToDerive How many stake key hashes should be discovered and can be used for signing
   */
  async getOrLoadAccount(
    index: number,
    reloadAccountInfo: boolean = true,
    reloadUtxos: boolean = true,
    stakeKeyHashesToDerive: number = 1
  ): Promise<Account> {
    const account = this.getAccount(index)
    if (account != null) {
      return account
    }
    return await this.accountManager.loadAccount(
      index,
      reloadAccountInfo,
      reloadUtxos,
      stakeKeyHashesToDerive
    )
  }

  getAccount(accountIndex: number): Account | undefined {
    return this.accountManager.getAccount(accountIndex)
  }

  /**
   * Submits transaction to the blockchain using this wallet's data provider.
   * Throws an error if the submission fails
   */
  async submitTx(txCbor: HexString): Promise<void> {
    await this.dataProvider.submitTx(txCbor)
  }

  getNetworkId(): NetworkId {
    return this.cryptoProvider.network.networkId
  }

  ensureFeatureIsSupported(feature: CryptoProviderFeature) {
    try {
      // TODO: refactor this so it doesnt throw but return error object
      this.cryptoProvider.ensureFeatureIsSupported(feature)
    } catch (e) {
      return {code: e.name, params: {message: e.message}}
    }
    return null
  }
}
