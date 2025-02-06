import {NETWORKS} from '@/constants'
import {NetworkName} from '@/types'

const cryptoProviderSettings = [
  // SHELLEY
  {
    description: '',
    secret: 'odor match funny accuse spatial copper purse milk quote wine salute three drip weasel fall',
    network: NETWORKS[NetworkName.MAINNET],
    type: 'mnemonic',
    isShelleyCompatible: true,
  },
]

const shelleyCryptoProviderSettings = {
  mnemonic15Word: {
    description: '',
    secret: 'odor match funny accuse spatial copper purse milk quote wine salute three drip weasel fall',
    network: NETWORKS[NetworkName.MAINNET],
    type: 'mnemonic',
    isShelleyCompatible: true,
  },
  mnemonic12Word: {
    description: '',
    secret: 'cruise bike bar reopen mimic title style fence race solar million clean',
    network: NETWORKS[NetworkName.MAINNET],
    type: 'mnemonic',
    isShelleyCompatible: false,
  },
  mnemonic15WordUnused: {
    description: '',
    secret:
      'hazard circle fossil diamond oxygen ankle tribe broken must comic duck chef bacon truly dish',
    network: NETWORKS[NetworkName.MAINNET],
    type: 'mnemonic',
    isShelleyCompatible: true,
  },
}

export {cryptoProviderSettings, shelleyCryptoProviderSettings}
