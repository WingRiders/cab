import {Account} from '@/account/Account'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {DataProvider} from '@/dataProvider'

type AccountIndex = number

export class AccountManager {
  public accounts: Record<AccountIndex, Account> = {}
  private cryptoProvider: ICryptoProvider
  private dataProvider: DataProvider
  private gapLimit: number

  constructor({
    cryptoProvider,
    dataProvider,
    gapLimit,
  }: {
    cryptoProvider: ICryptoProvider
    dataProvider: DataProvider
    gapLimit: number
  }) {
    this.cryptoProvider = cryptoProvider
    this.dataProvider = dataProvider
    this.gapLimit = gapLimit
  }

  public getAccount(accountIndex: number): Account | undefined {
    return this.accounts[accountIndex]
  }

  /**
   * Performs a sequential discovery of accounts up to the specified limit.
   *
   * @returns Promise of discovered accounts ordered by account index ascending
   */
  async discoverAccounts(maxAccounts: number): Promise<Account[]> {
    const accounts: Account[] = []

    for (let accountIndex = 0; accountIndex < maxAccounts; accountIndex++) {
      accounts[accountIndex] = await this.loadAccount(accountIndex)
      if (!accounts[accountIndex].getAccountInfo().isUsed) {
        // If the account is not used, we stop the discovery
        break
      }
    }

    return accounts
  }

  public async loadAccount(
    accountIndex: number,
    reloadAccountInfo: boolean = true,
    reloadUtxos: boolean = true,
    stakeKeyHashesToDerive: number = 1
  ): Promise<Account> {
    const account = new Account({
      cryptoProvider: this.cryptoProvider,
      dataProvider: this.dataProvider,
      accountIndex,
      gapLimit: this.gapLimit,
      stakeKeyHashesToDerive,
    })
    if (reloadAccountInfo) await account.reloadAccountInfo()
    if (reloadUtxos) await account.reloadUtxos()
    this.accounts[accountIndex] = account
    return account
  }
}
