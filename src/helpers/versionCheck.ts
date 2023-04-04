import {CryptoProviderVersion} from '@/types'

export const hasRequiredVersion = (current: CryptoProviderVersion, required: CryptoProviderVersion) =>
  current.major > required.major ||
  (current.major === required.major && current.minor > required.minor) ||
  (current.major === required.major &&
    current.minor === required.minor &&
    current.patch >= required.patch)
