import {CborizedCliWitness, TxAux, TxSigned} from '@/ledger/transaction'
import {TxWitnessSet} from '@/types'
import {BIP32Path} from '@/types/address'
import {Network} from '@/types/network'
import {AddressToPathMapper, CryptoProviderFeature, DerivationScheme} from '@/types/wallet'

export interface ICryptoProvider {
  network: Network
  load(): Promise<void>
  isHardwareSupported(): boolean
  getName(): string
  getSecret(): Buffer | void
  getHdPassphrase(): Buffer | void
  getDerivationScheme(): DerivationScheme
  getVersion(): string | null
  isFeatureSupported(feature: CryptoProviderFeature): boolean
  ensureFeatureIsSupported(feature: CryptoProviderFeature): void
  deriveXpub(derivationPath: BIP32Path): Promise<Buffer>
  displayAddressForPath(absDerivationPath: BIP32Path, stakingPath: BIP32Path): Promise<void>
  signTx(unsignedTx: TxAux, addressToPathMapper: AddressToPathMapper): Promise<TxSigned>
  witnessTx(unsignedTx: TxAux, addressToPathMapper: AddressToPathMapper): Promise<TxWitnessSet>
  witnessPoolRegTx(
    unsignedTx: TxAux,
    addressToPathMapper: AddressToPathMapper
  ): Promise<CborizedCliWitness>
}
