import {BigNumber} from 'bignumber.js'

import {Asset, CryptoProviderFeature, CryptoProviderVersion} from '../types'

export const ADA_DECIMALS = 6

export const MAX_INT32 = 2147483647
export const MAX_INT64 = new BigNumber('9223372036854775807')
export const MIN_INT64 = new BigNumber('-9223372036854775808')

export const DEFAULT_TTL_SLOTS = 3600 // 1 hours

export const MAX_ACCOUNT_INDEX = 30

export const DELAY_AFTER_TOO_MANY_REQUESTS = 2000

export {NETWORKS} from './networks'

export const PAGINATION_LIMIT = 200
export const MAX_URL_LENGTH = 2048

export const MAX_ADDRESS_SUMMARY_COUNT = 50
export const MAX_FETCHABLE_SHELLEY_ADDRESSES = 20

export const TREZOR_VERSIONS: {[key: number]: CryptoProviderVersion} = {
  [CryptoProviderFeature.MINIMAL]: {
    major: 2,
    minor: 3,
    patch: 2,
  },
  [CryptoProviderFeature.WITHDRAWAL]: {
    major: 2,
    minor: 3,
    patch: 2,
  },
  [CryptoProviderFeature.BULK_EXPORT]: {
    major: 2,
    minor: 3,
    patch: 2,
  },
  [CryptoProviderFeature.POOL_OWNER]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
  [CryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 3,
    patch: 5,
  },
  [CryptoProviderFeature.MINTING]: {
    major: 2,
    minor: 4,
    patch: 3,
  },
  [CryptoProviderFeature.PLUTUS]: {
    major: 2,
    minor: 5,
    patch: 1,
  },
}

export const LEDGER_VERSIONS: {[key: number]: CryptoProviderVersion} = {
  [CryptoProviderFeature.MINIMAL]: {
    major: 2,
    minor: 0,
    patch: 2,
  },
  [CryptoProviderFeature.WITHDRAWAL]: {
    major: 2,
    minor: 0,
    patch: 4,
  },
  [CryptoProviderFeature.BULK_EXPORT]: {
    major: 2,
    minor: 1,
    patch: 0,
  },
  [CryptoProviderFeature.POOL_OWNER]: {
    major: 2,
    minor: 1,
    patch: 0,
  },
  [CryptoProviderFeature.MULTI_ASSET]: {
    major: 2,
    minor: 2,
    patch: 0,
  },
  [CryptoProviderFeature.MINTING]: {
    major: 3,
    minor: 0,
    patch: 0,
  },
  [CryptoProviderFeature.PLUTUS]: {
    major: 4,
    minor: 0,
    patch: 0,
  },
}

export const AdaAsset: Asset = {
  policyId: '',
  assetName: '',
}

export const CREDENTIAL_HASH_SIZE = 28
export const TOKEN_NAME_MAX_SIZE = 32
