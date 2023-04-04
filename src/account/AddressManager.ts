import {Address} from '@/types/base'
import {AddressTypes, BIP32Path, PubKeyHash, StakingHash} from '@/types/address'

import {toBip32StringPath} from '../helpers'
import {
  AddressProvider,
  AddressToPathMapper,
  AddressToPathMapping,
  AddressWithMeta,
} from '@/types/wallet'
import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {ICryptoProvider} from '@/crypto'
import {
  shelleyBaseAddressProvider,
  bechAddressToHex,
  spendingHashFromAddress,
  stakingHashFromAddress,
} from '@/ledger/address'
import {
  shelleyStakingAccountProvider,
  shelleyEnterpriseAddressProvider,
} from '@/ledger/address/shelleyAddressProvider'
import {getAddressType} from 'cardano-crypto.js'
import {IOnChainDataProvider} from '@/dataProviders'

export class AddressManager {
  addressProvider: AddressProvider
  gapLimit: number
  onChainDataProvider: IOnChainDataProvider
  deriveAddressMemo: {[key: number]: {path: BIP32Path; address: Address}}

  constructor({
    addressProvider,
    gapLimit,
    onChainDataProvider,
  }: {
    addressProvider: AddressProvider
    gapLimit: number
    onChainDataProvider: IOnChainDataProvider
  }) {
    this.addressProvider = addressProvider
    this.gapLimit = gapLimit
    this.onChainDataProvider = onChainDataProvider
    this.deriveAddressMemo = {}

    if (!gapLimit) {
      throw new UnexpectedError(UnexpectedErrorReason.ParamsValidationError, {
        message: `Invalid gap limit: ${gapLimit}`,
      })
    }
  }

  async _deriveAddress(index: number): Promise<Address> {
    const memoKey = index

    if (!this.deriveAddressMemo[memoKey]) {
      this.deriveAddressMemo[memoKey] = await this.addressProvider(index)
    }

    return this.deriveAddressMemo[memoKey].address
  }

  async _deriveAddresses(beginIndex: number, endIndex: number): Promise<Address[]> {
    const derivedAddresses: Address[] = []
    for (let i = beginIndex; i < endIndex; i += 1) {
      derivedAddresses.push(await this._deriveAddress(i))
    }
    return derivedAddresses
  }

  async discoverAddresses(): Promise<Address[]> {
    let addresses: Address[] = []
    let from = 0
    let isGapBlock = false

    while (!isGapBlock) {
      const currentAddressBlock = await this._deriveAddresses(from, from + this.gapLimit)

      isGapBlock = (await this.onChainDataProvider.filterUsedAddresses(currentAddressBlock)).size === 0

      addresses = isGapBlock && addresses.length > 0 ? addresses : addresses.concat(currentAddressBlock)
      from += this.gapLimit
    }

    return addresses
  }

  // TODO(ppershing): we can probably get this info more easily
  // just by testing filterUnusedAddresses() backend call

  async discoverAddressesWithMeta(): Promise<AddressWithMeta[]> {
    const addresses = await this.discoverAddresses()
    const usedAddresses = await this.onChainDataProvider.filterUsedAddresses(addresses)

    return addresses.map((address) => ({
      address,
      bip32StringPath: toBip32StringPath(this.getAddressToAbsPathMapping()[address]),
      isUsed: usedAddresses.has(address),
    }))
  }

  // this is supposed to return {[key: Address]: BIP32Path} but ts does support
  // only strings and number as index signatures

  getAddressToAbsPathMapping(): AddressToPathMapping {
    const result = {}
    Object.values(this.deriveAddressMemo).map((value) => {
      result[value.address] = value.path
    })

    return result
  }
}

type MyAddressesParams = {
  accountIndex: number
  cryptoProvider: ICryptoProvider
  gapLimit: number
  onChainDataProvider: IOnChainDataProvider
}

export class MyAddresses {
  accountIndex: number
  gapLimit: number
  accountAddrManager: AddressManager
  baseExtAddrManager: AddressManager
  baseIntAddrManager: AddressManager
  enterpriseExtAddrManager: AddressManager
  enterpriseIntAddrManager: AddressManager
  cryptoProvider: ICryptoProvider

  constructor({accountIndex, cryptoProvider, gapLimit, onChainDataProvider}: MyAddressesParams) {
    this.accountIndex = accountIndex
    this.gapLimit = gapLimit
    this.cryptoProvider = cryptoProvider

    this.accountAddrManager = new AddressManager({
      addressProvider: shelleyStakingAccountProvider(cryptoProvider, accountIndex),
      gapLimit,
      onChainDataProvider,
    })

    this.baseExtAddrManager = new AddressManager({
      addressProvider: shelleyBaseAddressProvider(cryptoProvider, accountIndex, false),
      gapLimit,
      onChainDataProvider,
    })

    this.baseIntAddrManager = new AddressManager({
      addressProvider: shelleyBaseAddressProvider(cryptoProvider, accountIndex, true),
      gapLimit,
      onChainDataProvider,
    })

    this.enterpriseExtAddrManager = new AddressManager({
      addressProvider: shelleyEnterpriseAddressProvider(cryptoProvider, accountIndex, false),
      gapLimit,
      onChainDataProvider,
    })

    this.enterpriseIntAddrManager = new AddressManager({
      addressProvider: shelleyEnterpriseAddressProvider(cryptoProvider, accountIndex, true),
      gapLimit,
      onChainDataProvider,
    })
  }

  // TODO: Cache discovery of addresses
  async discoverAllAddresses() {
    const [baseInt, baseExt, enterpriseInt, enterpriseExt, accountAddr] = await Promise.all([
      this.baseIntAddrManager.discoverAddresses(),
      this.baseExtAddrManager.discoverAddresses(),
      this.enterpriseIntAddrManager.discoverAddresses(),
      this.enterpriseExtAddrManager.discoverAddresses(),
      this.accountAddrManager.discoverAddresses(),
    ])

    return {
      base: [...baseInt, ...baseExt],
      enterprise: [...enterpriseInt, ...enterpriseExt],
      account: accountAddr,
    }
  }

  async discoverAllAddressesWithMeta() {
    const [baseInt, baseExt, enterpriseInt, enterpriseExt, stakingAddresses] = await Promise.all([
      this.baseIntAddrManager.discoverAddressesWithMeta(),
      this.baseExtAddrManager.discoverAddressesWithMeta(),
      this.enterpriseIntAddrManager.discoverAddressesWithMeta(),
      this.enterpriseExtAddrManager.discoverAddressesWithMeta(),
      this.accountAddrManager.discoverAddressesWithMeta(),
    ])

    return {
      baseExt,
      baseInt,
      enterpriseExt,
      enterpriseInt,
      stakingAddress: stakingAddresses[0].address,
    }
  }

  getAddressToAbsPathMapper() {
    return this.fixedPathMapper()
  }

  fixedPathMapper(): AddressToPathMapper {
    const mappingShelley = {
      ...this.baseIntAddrManager.getAddressToAbsPathMapping(),
      ...this.baseExtAddrManager.getAddressToAbsPathMapping(),
      ...this.accountAddrManager.getAddressToAbsPathMapping(),
    }
    const mappingEnterpriseShelley = {
      // this will probably be duplicate with mappingShelley, just in case
      ...this.enterpriseExtAddrManager.getAddressToAbsPathMapping(),
      ...this.enterpriseIntAddrManager.getAddressToAbsPathMapping(),
    }

    const fixedShelley = {}
    for (const key in mappingShelley) {
      fixedShelley[bechAddressToHex(key)] = mappingShelley[key]
    }

    const pubkeyShelley = {}
    const stakingKeyShelley = {}
    for (const key in mappingShelley) {
      const addressBuffer = Buffer.from(bechAddressToHex(key), 'hex')
      if (
        [
          AddressTypes.BASE,
          AddressTypes.BASE_KEY_SCRIPT,
          AddressTypes.ENTERPRISE,
          AddressTypes.POINTER,
        ].includes(getAddressType(addressBuffer))
      ) {
        pubkeyShelley[spendingHashFromAddress(key as Address)] = mappingShelley[key]
      } else if (getAddressType(addressBuffer) === AddressTypes.REWARD) {
        stakingKeyShelley[stakingHashFromAddress(key as Address)] = mappingShelley[key]
      }
    }
    return (entry: Address | PubKeyHash | StakingHash) => {
      return (
        fixedShelley[entry] ||
        mappingShelley[entry] ||
        pubkeyShelley[entry] ||
        stakingKeyShelley[entry] ||
        mappingEnterpriseShelley[entry]
      )
    }
  }

  getStakingAddress(): Promise<Address> {
    return this.accountAddrManager._deriveAddress(this.accountIndex)
  }
}
