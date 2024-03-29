import {decodePaperWalletMnemonic, mnemonicToRootKeypair} from 'cardano-crypto.js'

import {WalletSecretDef} from '@/types/wallet'

import {derivationSchemes} from './derivationSchemes'
import {isMnemonicInPaperWalletFormat, validateMnemonic} from './mnemonic'

const guessDerivationSchemeFromMnemonic = (mnemonic) => {
  return mnemonic.split(' ').length === 12 ? derivationSchemes.v1 : derivationSchemes.v2
}

export const mnemonicToWalletSecretDef = async (mnemonic): Promise<WalletSecretDef> => {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic format')
  }
  if (await isMnemonicInPaperWalletFormat(mnemonic)) {
    mnemonic = await decodePaperWalletMnemonic(mnemonic)
  }

  const derivationScheme = guessDerivationSchemeFromMnemonic(mnemonic)
  const rootSecret = await mnemonicToRootKeypair(mnemonic, derivationScheme.ed25519Mode)

  return {
    rootSecret,
    derivationScheme,
  }
}
