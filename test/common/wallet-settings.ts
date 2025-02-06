import {shelleyCryptoProviderSettings} from './crypto-provider-settings'

export const walletSettings = {
  Shelley15Word: {
    ...shelleyCryptoProviderSettings.mnemonic15Word,
  },
  Shelley15WordUnused: {
    ...shelleyCryptoProviderSettings.mnemonic15WordUnused,
  },
}
