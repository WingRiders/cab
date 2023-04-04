import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {MAX_ACCOUNT_INDEX} from '@/constants'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {CryptoProviderFeature} from '@/types/wallet'
import {Account} from '@/account/Account'
import {ILedgerStateDataProvider, IOnChainDataProvider} from '@/dataProviders'

type AccountManagerConfig = {
  shouldExportPubKeyBulk: boolean
  gapLimit: number
}

type AccountIndex = number

export class AccountManager {
  accounts: Record<AccountIndex, Account>
  config: AccountManagerConfig
  cryptoProvider: ICryptoProvider
  maxAccountIndex: number = MAX_ACCOUNT_INDEX

  private onChainDataProvider: IOnChainDataProvider
  private ledgerStateDataProvider: ILedgerStateDataProvider

  constructor({
    onChainDataProvider,
    ledgerStateDataProvider,
    cryptoProvider,
    config,
  }: {
    onChainDataProvider: IOnChainDataProvider
    ledgerStateDataProvider: ILedgerStateDataProvider
    cryptoProvider: ICryptoProvider
    config: AccountManagerConfig
  }) {
    this.accounts = {}
    this.config = config
    this.cryptoProvider = cryptoProvider
    this.onChainDataProvider = onChainDataProvider
    this.ledgerStateDataProvider = ledgerStateDataProvider
  }

  private assertAccountExists(accountIndex: number): asserts this is typeof this {
    if (!(accountIndex in this.accounts)) {
      throw new CabInternalError(CabInternalErrorReason.AccountNotDiscovered)
    }
  }

  public getAccount(accountIndex: number): Account {
    this.assertAccountExists(accountIndex)
    return this.accounts[accountIndex]
  }

  public getAccounts(): Account[] {
    // Sort the accounts in ascending order based on their accountIndex
    return Object.values(this.accounts).sort(
      (accountA, accountB) => accountA.accountIndex - accountB.accountIndex
    )
  }

  public getMaxAccountIndex(): number {
    return this.maxAccountIndex
  }

  private initAccount(accountIndex: number): Account {
    return new Account({
      gapLimit: this.config.gapLimit,
      cryptoProvider: this.cryptoProvider,
      onChainDataProvider: this.onChainDataProvider,
      ledgerStateDataProvider: this.ledgerStateDataProvider,
      accountIndex,
    })
  }

  private getLastAccountIndex() {
    // Get lastUsedAccountIndex, if no accounts are discovered this returns 0
    return Math.max(0, ...Object.keys(this.accounts).map(Number.parseInt))
  }

  /**
   * The function loads an account and adds it to the list of available
   * accounts. If the account is already present it just ensures it's loaded.
   */
  private async addAccount(account: Account): Promise<void> {
    // If we already have this acocunt just ensure it's loaded
    if (account.accountIndex in this.accounts) {
      await this.accounts[account.accountIndex].load()
      return
    }
    // Otherwise load in a new account
    await account.load()
    this.accounts[account.accountIndex] = account
  }

  /**
   * Adds all accounts specified by the accountIndexes array.
   */
  async addAccounts(accountIndexes: number[]): Promise<Record<AccountIndex, Account>> {
    await Promise.all(accountIndexes.map(this.initAccount.bind(this)).map(this.addAccount.bind(this)))
    return this.accounts
  }

  private shouldExploreAccounts(): boolean {
    const isBulkExportSupported = this.cryptoProvider.isFeatureSupported(
      CryptoProviderFeature.BULK_EXPORT
    )
    return this.config.shouldExportPubKeyBulk && isBulkExportSupported
  }

  async discoverAccounts(): Promise<Account[]> {
    const _discoverNextAccount = async (accountIndex: number) => {
      let isAccountUsed: boolean = false

      if (accountIndex in this.accounts) {
        isAccountUsed = this.accounts[accountIndex].getAccountInfo().isUsed
      } else {
        const newAccount = this.initAccount(accountIndex)
        await this.addAccount(newAccount)
        isAccountUsed = this.accounts[accountIndex].getAccountInfo().isUsed
      }

      return (
        this.shouldExploreAccounts() &&
        isAccountUsed &&
        accountIndex < this.maxAccountIndex &&
        (await _discoverNextAccount(accountIndex + 1))
      )
    }

    // Start discovering from the last account index
    await _discoverNextAccount(this.getLastAccountIndex())
    return this.getAccounts()
  }
}
