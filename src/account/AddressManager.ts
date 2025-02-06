import {range} from 'lodash'

import {ICryptoProvider} from '@/crypto'
import {Address as HexAddress} from '@/dappConnector'
import {DataProvider} from '@/dataProvider'
import {baseAddressFromXpub, HARDENED_THRESHOLD, stakingAddressFromXpub} from '@/ledger/address'
import {
  bechAddressToHex,
  enterpriseAddressFromXpub,
  xpub2blake2b224Hash,
} from '@/ledger/address/addressHelpers'
import {Address, AddressToPathMapper, AddrKeyHash, BIP32Path} from '@/types'

import {AddressesInfo, AddressWithMeta} from './addressesInfo'

// https://cips.cardano.org/cip/CIP-1852
enum Chain {
  External = 0,
  Internal = 1,
  Staking = 2,
  DRep = 3,
  ConstitutionalCommitteeCold = 4,
  ConstitutionalCommitteeHot = 5,
}

export class AddressManager {
  private gapLimit: number
  private accountIndex: number
  private cryptoProvider: ICryptoProvider
  private dataProvider: DataProvider
  private addrKeyHashes: Record<AddrKeyHash, BIP32Path>
  private readonly stakeKeyHashesToDerive: number

  // Bech32 representation of the addresses
  private addresses: AddressesInfo

  constructor({
    accountIndex,
    cryptoProvider,
    dataProvider,
    gapLimit = 20,
    stakeKeyHashesToDerive,
  }: {
    accountIndex: number
    cryptoProvider: ICryptoProvider
    dataProvider: DataProvider
    gapLimit: number
    stakeKeyHashesToDerive: number
  }) {
    this.accountIndex = accountIndex
    this.gapLimit = gapLimit
    this.cryptoProvider = cryptoProvider
    this.dataProvider = dataProvider
    this.stakeKeyHashesToDerive = stakeKeyHashesToDerive
  }

  private path(chain: Chain, index: number): BIP32Path {
    return [
      1852 + HARDENED_THRESHOLD,
      1815 + HARDENED_THRESHOLD,
      this.accountIndex + HARDENED_THRESHOLD,
      chain,
      index,
    ]
  }

  public async ensureXpubIsExported() {
    for (const chain of [Chain.External, Chain.Staking]) {
      await this.cryptoProvider.deriveXpub(this.path(chain, 0))
    }
  }

  public async deriveStakingAddress(index: number): Promise<Address> {
    const stakeXpub = await this.cryptoProvider.deriveXpub(this.path(Chain.Staking, index))
    return stakingAddressFromXpub(stakeXpub, this.cryptoProvider.network.networkId)
  }

  public deriveStakingAddresses(beginIndex: number, endIndex: number): Promise<Address[]> {
    return Promise.all(range(beginIndex, endIndex).map((i) => this.deriveStakingAddress(i)))
  }

  private generateXpubs(
    from: number,
    count: number,
    chain: Chain
  ): Promise<{path: BIP32Path; xpub: Buffer}[]> {
    // What paths are we going to derive
    const paths = range(from, from + count).map((index) => this.path(chain, index))

    // Derive xpubs for the paths
    return Promise.all(
      paths.map(async (path) => ({path, xpub: await this.cryptoProvider.deriveXpub(path)}))
    )
  }

  private addXpubsToAddrKeyHashes(xpubs: {path: BIP32Path; xpub: Buffer}[]) {
    this.addrKeyHashes = {
      ...this.addrKeyHashes,
      ...Object.fromEntries(
        xpubs.map(({xpub, path}) => [xpub2blake2b224Hash(xpub).toString('hex'), path])
      ),
    }
  }

  private async _discoverAddresses(stakeXpub: Buffer, from: number, count: number, chain: Chain) {
    const xpubs = await this.generateXpubs(from, count, chain)
    this.addXpubsToAddrKeyHashes(xpubs)

    // Create the addresses
    const baseAddresses = xpubs.map(({xpub, path}) => ({
      address: baseAddressFromXpub(xpub, stakeXpub, this.cryptoProvider.network.networkId),
      path,
    }))
    const enterpriseAddresses = xpubs.map(({xpub, path}) => ({
      address: enterpriseAddressFromXpub(xpub, this.cryptoProvider.network.networkId),
      path,
    }))

    // Get set of used addresses
    const usedAddresses = await this.dataProvider.filterUsedAddresses(
      [...baseAddresses, ...enterpriseAddresses].map(({address}) => address)
    )

    const baseAddressesWithMeta = baseAddresses.map(({address, path}) => ({
      address,
      path,
      isUsed: usedAddresses.has(address),
    }))
    const enterpriseAddressesWithMeta = enterpriseAddresses.map(({address, path}) => ({
      address,
      path,
      isUsed: usedAddresses.has(address),
    }))

    const lastUsedIndex = Math.max(
      ...[...baseAddressesWithMeta, ...enterpriseAddressesWithMeta]
        .filter(({isUsed}) => isUsed)
        .map(({path}) => path[4])
    )

    return {baseAddressesWithMeta, enterpriseAddressesWithMeta, lastUsedIndex}
  }

  /**
   * As CIP-1852 extends BIP44, the discovery follows rules outlined here:
   * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#account-discovery
   *
   * Most notably this part:
   * > Address gap limit is currently set to 20. If the software hits 20 unused addresses in a row,
   * > it expects there are no used addresses beyond this point and stops searching the address chain.
   * > We scan just the external chains, because internal chains receive only coins that come from the
   * > associated external chains.
   *
   * The gap limit can be set in the constructor.
   */
  public async discoverAddresses() {
    // First derive stakeKeyHash, only one per account with index 0
    const stakeXpub = await this.cryptoProvider.deriveXpub(this.path(Chain.Staking, 0))
    this.addresses = {
      stakingAddress: stakingAddressFromXpub(stakeXpub, this.cryptoProvider.network.networkId),
      baseExternal: [],
      enterpriseExternal: [],
      baseInternal: [],
      enterpriseInternal: [],
    }

    // Then start the discovery, only using the external addresses, after that we can derive the internal ones
    let from = 0
    let lastUsedIndex = -1
    let continueDiscovery = true
    while (continueDiscovery) {
      const {
        baseAddressesWithMeta,
        enterpriseAddressesWithMeta,
        lastUsedIndex: newLastUsedIndex,
      } = await this._discoverAddresses(stakeXpub, from, this.gapLimit, Chain.External)

      this.addresses.baseExternal.push(...baseAddressesWithMeta)
      this.addresses.enterpriseExternal.push(...enterpriseAddressesWithMeta)

      // Continue discovery if we discovered any new used addresses in this block
      // This also handles the case where the only discovered address is the first one
      // in that case we also don't continue with discovery
      continueDiscovery = newLastUsedIndex > lastUsedIndex
      from += this.gapLimit
      lastUsedIndex = newLastUsedIndex
    }

    // After discovering all external addresses, derive the internal ones
    const {baseAddressesWithMeta: baseInternal, enterpriseAddressesWithMeta: enterpriseInternal} =
      await this._discoverAddresses(stakeXpub, 0, this.addresses.baseExternal.length, Chain.Internal)
    this.addresses.baseInternal = baseInternal
    this.addresses.enterpriseInternal = enterpriseInternal

    // Then store derived stake key hashes
    const stakingXpubs = await this.generateXpubs(0, this.stakeKeyHashesToDerive, Chain.Staking)
    this.addXpubsToAddrKeyHashes(stakingXpubs)

    return this.addresses
  }

  public getAddressToPathMapper(): AddressToPathMapper {
    type Entry = [Parameters<AddressToPathMapper>[0], ReturnType<AddressToPathMapper>]

    const addressToEntry = ({address, path}: AddressWithMeta): Entry => [address, path]

    const entries: Entry[] = [
      [this.addresses.stakingAddress, this.path(Chain.Staking, 0)],
      [bechAddressToHex(this.addresses.stakingAddress) as HexAddress, this.path(Chain.Staking, 0)],
      ...(Object.entries(this.addrKeyHashes) as Entry[]),
      ...this.addresses.baseExternal.map(addressToEntry),
      ...this.addresses.enterpriseExternal.map(addressToEntry),
      ...this.addresses.baseInternal.map(addressToEntry),
      ...this.addresses.enterpriseInternal.map(addressToEntry),
    ]
    const mapper = Object.fromEntries(entries)

    return (item) => mapper[item]
  }
}
