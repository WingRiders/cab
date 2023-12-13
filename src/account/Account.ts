import partition from 'lodash/partition'

import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {isRecommendedCollateral} from '@/helpers'
import {bechAddressToHex} from '@/ledger/address'
import {aggregateTokenBundles} from '@/ledger/assets'
import {computeMinUTxOLovelaceAmount, TxAux} from '@/ledger/transaction'
import {
  Address,
  AddressWithMeta,
  BigNumber,
  IBlockchainExplorer,
  Lovelace,
  ProtocolParameters,
  StakePoolInfoExtended,
  TokenBundle,
  TxOutputType,
  UTxO,
  ZeroLovelace,
} from '@/types'

import {MyAddresses} from './AddressManager'

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

export type StakingInfo = {
  currentEpoch: number
  isStakeKeyRegistered: boolean
  delegation: StakePoolInfoExtended & {
    retiringEpoch: number | null
    url: string
  }
  rewards: Lovelace
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
 * The source of UTxOs, used addresses and staking info is the Blockchain Explorer.
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
  private blockchainExplorer: IBlockchainExplorer

  protected accountInfo: AccountInfo | null
  protected utxos: UTxO[] | null
  protected stakingInfo: StakingInfo | null

  // TODO: Make private, and think of better way to enable derivation of custom
  //       addresses
  public myAddresses: MyAddresses

  constructor({
    cryptoProvider,
    blockchainExplorer,
    accountIndex,
    gapLimit,
  }: {
    cryptoProvider: ICryptoProvider
    blockchainExplorer: IBlockchainExplorer
    accountIndex: number
    /**
     * Gap limit signalizes that after how many unused addresses to stop
     * looking for used ones when doing address exploration
     */
    gapLimit: number
  }) {
    this.accountIndex = accountIndex

    this.cryptoProvider = cryptoProvider
    this.blockchainExplorer = blockchainExplorer

    this.accountInfo = null
    this.utxos = null
    this.stakingInfo = null

    this.myAddresses = new MyAddresses({
      accountIndex,
      cryptoProvider,
      gapLimit,
      blockchainExplorer,
    })
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

  private assertStakingInfoLoaded(): asserts this is typeof this & {stakingInfo: StakingInfo} {
    if (this.stakingInfo === null) {
      // TODO: Clean-up errors and set proper error message here
      throw new CabInternalError(CabInternalErrorReason.AccountNotLoaded)
    }
  }

  /**
   * Fetches account info for this account which includes, deriving addresses
   * associated with this account and checking whether they are in use or not
   */
  private async fetchAccountInfo(): Promise<AccountInfo> {
    const addresses = await this.myAddresses.discoverAllAddressesWithMeta()
    const [usedAddresses, unusedAddresses] = partition(
      [
        ...addresses.baseExt,
        ...addresses.baseInt,
        ...addresses.enterpriseExt,
        ...addresses.enterpriseInt,
      ],
      (addressWithMeta) => addressWithMeta.isUsed
    )

    return {
      accountIndex: this.accountIndex,
      isUsed: usedAddresses.length > 0,
      usedAddresses,
      unusedAddresses,
      addresses: {
        baseExternal: addresses.baseExt,
        enterpriseExternal: addresses.enterpriseExt,
        baseInternal: addresses.baseInt,
        enterpriseInternal: addresses.enterpriseInt,
      },
      stakingAddress: addresses.stakingAddress,
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

    return this.blockchainExplorer.fetchUnspentTxOutputs(
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
    await this.myAddresses.baseExtAddrManager._deriveAddress(0)
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

  public getUtxos(): UTxO[] {
    this.assertUTxOsLoaded()
    return this.utxos
  }

  public getCollateralUtxos() {
    this.assertUTxOsLoaded()
    return this.utxos.filter(isRecommendedCollateral)
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

  /**
   * This function simulates the creation of a collector UTxO (aka that would have all the tokens)
   * and calculates the total ada - minUTxOLovelaceAmount
   * It does not consider corner cases, such as:
   * - the user has more tokens than we can fit in a collector UTxO
   * - the user has enough of a single token as to not fit into a single UTxO (over 2^63-1)
   */
  public getUsableBalance(protocolParameters: ProtocolParameters): Lovelace {
    const {coins, tokenBundle} = this.getBalance()
    const address = this.getChangeAddress()
    const minUTxOLovelaceAmount = computeMinUTxOLovelaceAmount({
      protocolParameters,
      output: {type: TxOutputType.LEGACY, isChange: false, coins: ZeroLovelace, address, tokenBundle},
    })
    return BigNumber.max(coins.minus(minUTxOLovelaceAmount), 0) as Lovelace
  }

  private async fetchStakingInfo(): Promise<StakingInfo> {
    this.assertAccountInfoLoaded()
    const stakingAddressHex = bechAddressToHex(this.accountInfo.stakingAddress)
    const stakingInfo = await this.blockchainExplorer.getStakingInfo(stakingAddressHex)

    return {
      currentEpoch: stakingInfo.currentEpoch,
      isStakeKeyRegistered: stakingInfo.hasStakingKey,
      delegation: stakingInfo.delegation,
      rewards: new Lovelace(stakingInfo.rewards || 0, 10) as Lovelace,
    }
  }

  public async reloadStakingInfo(): Promise<Account> {
    this.stakingInfo = await this.fetchStakingInfo()
    return this
  }

  public async loadStakingInfo(): Promise<Account> {
    if (this.stakingInfo === null) {
      await this.reloadStakingInfo()
    }

    return this
  }

  public getStakingInfo(): StakingInfo {
    this.assertStakingInfoLoaded()
    return this.stakingInfo
  }

  public async signTxAux(txAux: TxAux) {
    try {
      const signedTx = await this.cryptoProvider.signTx(txAux, this.myAddresses.fixedPathMapper())
      return signedTx
    } catch (e) {
      throw new CabInternalError(CabInternalErrorReason.TransactionRejectedWhileSigning, {
        message: e.message,
      })
    }
  }

  public async witnessTxAux(txAux: TxAux) {
    try {
      const witnessSet = await this.cryptoProvider.witnessTx(txAux, this.myAddresses.fixedPathMapper())
      return witnessSet
    } catch (e) {
      throw new CabInternalError(CabInternalErrorReason.TransactionRejectedWhileSigning, {
        message: e.message,
      })
    }
  }
}
