import {BIP32Path, HexString} from '@/types'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {AddressProvider} from '@/types/wallet'
import {XPubKey} from '@/types/address'
import {HARDENED_THRESHOLD} from './addressConstants'
import {stakingAddressFromXpub, baseAddressFromXpub, enterpriseAddressFromXpub} from './addressHelpers'

const shelleyPath = (account: number, isChange: boolean, addrIdx: number): BIP32Path => {
  return [
    HARDENED_THRESHOLD + 1852,
    HARDENED_THRESHOLD + 1815,
    HARDENED_THRESHOLD + account,
    isChange ? 1 : 0,
    addrIdx,
  ]
}

const shelleyStakeAccountPath = (account: number, addrIdx: number = 0): BIP32Path => {
  return [
    HARDENED_THRESHOLD + 1852,
    HARDENED_THRESHOLD + 1815,
    HARDENED_THRESHOLD + account,
    2, // "staking key chain"
    addrIdx,
  ]
}

export const getStakingXpub = async (
  cryptoProvider: ICryptoProvider,
  accountIndex: number,
  addressIndex: number = 0
): Promise<XPubKey> => {
  const path = shelleyStakeAccountPath(accountIndex, addressIndex)
  const xpubHex = (await cryptoProvider.deriveXpub(path)).toString('hex')
  return {
    path,
    xpubHex,
  }
}

export const getAccountXpub = async (
  cryptoProvider: ICryptoProvider,
  accountIndex: number
): Promise<XPubKey> => {
  const path = shelleyStakeAccountPath(accountIndex).slice(0, 3)

  const xpubHex: HexString = (await cryptoProvider.deriveXpub(path)).toString('hex')
  return {
    path,
    xpubHex,
  }
}

export const shelleyStakingAccountProvider =
  (cryptoProvider: ICryptoProvider, accountIndex: number): AddressProvider =>
  async (addressIndex: number) => {
    const pathStake = shelleyStakeAccountPath(accountIndex, addressIndex)
    const stakeXpub = await cryptoProvider.deriveXpub(pathStake)

    return {
      path: pathStake,
      address: stakingAddressFromXpub(stakeXpub, cryptoProvider.network.networkId),
    }
  }

export const shelleyBaseAddressProvider =
  (cryptoProvider: ICryptoProvider, accountIndex: number, isChange: boolean): AddressProvider =>
  async (addressIndex: number) => {
    const pathSpend = shelleyPath(accountIndex, isChange, addressIndex)
    const spendXpub = await cryptoProvider.deriveXpub(pathSpend)

    const pathStake = shelleyStakeAccountPath(accountIndex)
    const stakeXpub = await cryptoProvider.deriveXpub(pathStake)

    return {
      path: pathSpend,
      address: baseAddressFromXpub(spendXpub, stakeXpub, cryptoProvider.network.networkId),
    }
  }

export const shelleyEnterpriseAddressProvider =
  (cryptoProvider: ICryptoProvider, accountIndex: number, isChange: boolean): AddressProvider =>
  async (addressIndex: number) => {
    const pathSpend = shelleyPath(accountIndex, isChange, addressIndex)
    const spendXpub = await cryptoProvider.deriveXpub(pathSpend)

    return {
      path: pathSpend,
      address: enterpriseAddressFromXpub(spendXpub, cryptoProvider.network.networkId),
    }
  }
