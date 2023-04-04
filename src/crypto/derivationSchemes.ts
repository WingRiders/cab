import {DerivationScheme} from '@/types/wallet'

export const derivationSchemes: {[key: string]: DerivationScheme} = {
  v1: {
    type: 'v1',
    ed25519Mode: 1,
    keyfileVersion: '1.0.0',
  },
  v2: {
    type: 'v2',
    ed25519Mode: 2,
    keyfileVersion: '2.0.0',
  },
}
