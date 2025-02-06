import {partition} from 'lodash'

import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {DataProvider} from '@/dataProvider'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {isCustomCollateral, MIN_RECOMMENDED_COLLATERAL_AMOUNT} from '@/helpers/collaterals'
import {aggregateTokenBundles} from '@/ledger/assets'
import {TxAux} from '@/ledger/transaction'
import {Address, BigNumber, Lovelace, TokenBundle, UTxO} from '@/types'

import {Address as HexAddress, DataSignature, HexString} from '../dappConnector'
import {AddressWithMeta, getAllAddresses} from './addressesInfo'
import {AddressManager} from './AddressManager'

export type AccountInfo = {
  accountIndex: number
  isUsed: boolean
  usedAddresses: AddressWithMeta[]
  unusedAddresses: AddressWithMeta[]
  addresses: {
    baseExternal: AddressWithMeta[]
    enterpriseExternal: AddressWithMeta[]
    baseInternal: AddressWithMeta[]
    enterpriseInternal: AddressWithMeta[]
  }
  stakingAddress: Address
}

/**
 * Account is derived by the derivation path `m/1852'/1815'/accountIndex'`
 *
 * Each account provides information about its addresses (base, enterprise and
 * staking) and whether they are used or not. Based on these addresses it can
 * query available account UTxOs and from them derive the total balance of the account.
 *
 * On demand it can also report staking information - available rewards, current delegation.
 *
 * Another responsibility is the ability to witness transactions, with the
 * private keys belonging to one of its addresses.
 *
 * The source of UTxOs, used addresses and staking info is cab-backend.
 *
 * By default Account is loaded once on initialization, and to get new data
 * it needs to be explicitly reloaded by calling the appropriate methods:
 * - `reloadAccountInfo()` - reloads the accountInfo, also rediscovering used addresses
 * - `reloadUTxOs()` - reloads available UTxOs on used addresses
 * - `reloadStakingInfo()` - reloads the stakingInfo
 *
 * ⚠️ Public getters ensure that the account is loaded before returning any
 *   data, and throw an exception otherwise.
 */
export class Account {
  public accountIndex: number

  private cryptoProvider: ICryptoProvider
  private dataProvider: DataProvider
  private addressManager: AddressManager

  protected accountInfo: AccountInfo | null
  protected utxos: UTxO[] | null

  constructor({
    cryptoProvider,
    dataProvider,
    accountIndex,
    gapLimit,
    stakeKeyHashesToDerive,
  }: {
    cryptoProvider: ICryptoProvider
    dataProvider: DataProvider
    accountIndex: number
    /**
     * Gap limit signalizes that after how many unused addresses to stop
     * looking for used ones when doing address exploration
     */
    gapLimit: number
    stakeKeyHashesToDerive: number
  }) {
    this.accountIndex = accountIndex

    this.cryptoProvider = cryptoProvider
    this.dataProvider = dataProvider
    this.addressManager = new AddressManager({
      accountIndex,
      cryptoProvider,
      dataProvider,
      gapLimit,
      stakeKeyHashesToDerive,
    })

    this.accountInfo = null
    this.utxos = null
  }

  private assertAccountInfoLoaded(): asserts this is typeof this & {accountInfo: AccountInfo} {
    if (this.accountIndex === null) {
      throw new CabInternalError(CabInternalErrorReason.AccountNotLoaded)
    }
  }

  private assertUTxOsLoaded(): asserts this is typeof this & {utxos: UTxO[]} {
    if (this.utxos === null) {
      // TODO: Clean-up errors and set proper error message here
      throw new CabInternalError(CabInternalErrorReason.AccountNotLoaded)
    }
  }

  /**
   * Fetches account info for this account which includes, deriving addresses
   * associated with this account and checking whether they are in use or not
   */
  private async fetchAccountInfo(): Promise<AccountInfo> {
    const addressesInfo = await this.addressManager.discoverAddresses()
    const {stakingAddress, ...addresses} = addressesInfo
    const allAddresses = getAllAddresses(addressesInfo)
    const [usedAddresses, unusedAddresses] = partition(allAddresses, ({isUsed}) => isUsed)

    return {
      accountIndex: this.accountIndex,
      isUsed: usedAddresses.length > 0,
      usedAddresses,
      unusedAddresses,
      addresses,
      stakingAddress,
    }
  }

  public async reloadAccountInfo(): Promise<Account> {
    this.accountInfo = await this.fetchAccountInfo()
    return this
  }

  /**
   * Fetches UTxOs on all base and enterprise addresses of the account,
   * calling this method requires the account info to be already loaded
   */
  private fetchUTxOs(): Promise<UTxO[]> {
    const {baseExternal, baseInternal, enterpriseExternal, enterpriseInternal} =
      this.getAccountInfo().addresses

    return this.dataProvider.getUTxOs(
      [...baseExternal, ...baseInternal, ...enterpriseExternal, ...enterpriseInternal].map(
        ({address}) => address
      )
    )
  }

  public async reloadUtxos(): Promise<Account> {
    this.utxos = await this.fetchUTxOs()
    return this
  }

  public async reload(): Promise<Account> {
    await this.reloadAccountInfo()
    await this.reloadUtxos()
    return this
  }

  /**
   * Ensure that we can derive the first address to ensure that public key
   * was exported. Important for compatibility with hardware wallets
   */
  private async ensureXpubIsExported(): Promise<void> {
    await this.addressManager.ensureXpubIsExported()
  }

  /**
   * Loads the account, this first loads the account info and after loads
   * available UTxOs on all the base and enterprise addresses of the account
   */
  public async load(): Promise<Account> {
    await this.ensureXpubIsExported()
    if (this.accountInfo === null) {
      await this.reloadAccountInfo()
    }
    if (this.utxos === null) {
      await this.reloadUtxos()
    }
    return this
  }

  /**
   * Gets the first base external address. E.g. the one derived by derivation
   * path `m/1852'/1815'/accountIndex'/0/0`.
   */
  public getFirstVisibleAddress(): Address {
    const addressWithMeta = this.getAccountInfo().addresses.baseExternal[0]

    // If the first base external address is for some reason not defined
    // throw an error
    if (!addressWithMeta) {
      throw new CabInternalError(CabInternalErrorReason.AccountNotLoaded)
    }

    return addressWithMeta.address
  }

  /**
   * Gets the change address for the account. CAB by default defines the change
   * address as the first base external address.
   *
   * @see getFirstVisibleAddress
   */
  public getChangeAddress(): Address {
    return this.getFirstVisibleAddress()
  }

  /**
   * Get the staking address for this account, derived by the derivation path
   * `m/1852'/1815'/accountIndex'/2/0`
   */
  public getStakingAddress(): Address {
    this.assertAccountInfoLoaded()
    return this.accountInfo.stakingAddress
  }

  public deriveStakingAddress(index: number): Promise<Address> {
    return this.addressManager.deriveStakingAddress(index)
  }

  public deriveStakingAddresses(beginIndex: number, endIndex: number): Promise<Address[]> {
    return this.addressManager.deriveStakingAddresses(beginIndex, endIndex)
  }

  public getUtxos(): UTxO[] {
    this.assertUTxOsLoaded()
    return this.utxos
  }

  public getCollateralUtxos(minCollateralAmount: number = MIN_RECOMMENDED_COLLATERAL_AMOUNT) {
    this.assertUTxOsLoaded()
    return this.utxos.filter(isCustomCollateral(minCollateralAmount))
  }

  public getAccountInfo(): AccountInfo {
    this.assertAccountInfoLoaded()
    return this.accountInfo
  }

  /**
   * Gets the current Lovelace and token balance of the account, by aggregating
   * all the available UTxOs.
   * With large Accounts this can be a heavy operation, so by default it's
   * cached until the UTxOs are not reloaded.
   */
  public getBalance(): {coins: Lovelace; tokenBundle: TokenBundle} {
    // TODO: cache until utxo reload
    const utxos = this.getUtxos()
    const tokenBundles = utxos.map((utxo) => utxo.tokenBundle)
    const coins = BigNumber.sum(0, ...utxos.map((utxo) => utxo.coins as BigNumber)) as Lovelace
    const tokenBundle = aggregateTokenBundles(tokenBundles).filter((token) => token.quantity.gt(0))
    return {
      coins,
      tokenBundle,
    }
  }

  public async signTxAux(txAux: TxAux) {
    try {
      const signedTx = await this.cryptoProvider.signTx(
        txAux,
        this.addressManager.getAddressToPathMapper()
      )
      return signedTx
    } catch (e) {
      throw new CabInternalError(CabInternalErrorReason.TransactionRejectedWhileSigning, {
        message: e.message,
      })
    }
  }

  public async witnessTxAux(txAux: TxAux) {
    try {
      const witnessSet = await this.cryptoProvider.witnessTx(
        txAux,
        this.addressManager.getAddressToPathMapper()
      )
      return witnessSet
    } catch (e) {
      throw new CabInternalError(CabInternalErrorReason.TransactionRejectedWhileSigning, {
        message: e.message,
      })
    }
  }

  public signData(address: HexAddress, data: HexString): Promise<DataSignature> {
    return this.cryptoProvider.signData(address, data, this.addressManager.getAddressToPathMapper())
  }
}
