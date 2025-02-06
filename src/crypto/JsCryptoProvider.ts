/* eslint-disable no-use-before-define */
/* eslint-disable camelcase */
import {encode} from 'borc'
import {
  addressToBuffer,
  derivePrivate,
  hasStakingScript,
  sign as signMsg,
  xpubToHdPassphrase,
} from 'cardano-crypto.js'
import {chain} from 'lodash'

import {removeNullFields} from '@/helpers/removeNullFields'
import {
  hasSpendingScript,
  isShelleyPath,
  spendingHashFromAddress,
  stakingHashFromAddress,
  xpub2pub,
} from '@/ledger/address'
import {
  CborizedTxStructured,
  cborizeTxWitnesses,
  ShelleyTransactionStructured,
  ShelleyTxAux,
  TxAux,
  TxSigned,
} from '@/ledger/transaction'
import {hashSerialized} from '@/ledger/transaction/utils'
import {
  BIP32Path,
  CryptoProviderFeature,
  HexString,
  Network,
  PubKeyHash,
  TokenBundle,
  TxScriptSource,
  TxShelleyWitness,
  TxWitnessSet,
} from '@/types'
import {TxDatum, TxInput, TxRedeemer} from '@/types/transaction'
import {AddressToPathMapper, DerivationScheme} from '@/types/wallet'

import {Address, DataSignature} from '../dappConnector'
import {
  CabInternalError,
  CabInternalErrorReason,
  UnexpectedError,
  UnexpectedErrorReason,
} from '../errors'
import {CachedDeriveXpubFactory} from './helpers/CachedDeriveXpubFactory'
import HdNode, {_HdNode} from './helpers/hdNode'
import {ICryptoProvider} from './ICryptoProvider'

type CryptoProviderConfig = {
  shouldExportPubKeyBulk: boolean
}

type CryptoProviderParams = {
  walletSecretDef: any
  network: Network
  config: CryptoProviderConfig
}

export class JsCryptoProvider implements ICryptoProvider {
  masterHdNode: _HdNode
  derivationScheme: DerivationScheme
  _deriveXpub: (path: BIP32Path) => Promise<Buffer>
  network: Network

  constructor({walletSecretDef: {rootSecret, derivationScheme}, network, config}: CryptoProviderParams) {
    this.network = network
    this.masterHdNode = HdNode(rootSecret)
    this.derivationScheme = derivationScheme
    this._deriveXpub = CachedDeriveXpubFactory(
      derivationScheme,
      config.shouldExportPubKeyBulk,
      (derivationPaths: BIP32Path[]) => {
        return derivationPaths.map((path) => this.deriveHdNode(path).extendedPublicKey)
      }
    )
  }

  load() {
    return Promise.resolve()
  }

  isHardwareSupported() {
    return false
  }

  getName() {
    return 'mnemonic'
  }

  getSecret() {
    return this.masterHdNode.toBuffer()
  }

  getHdPassphrase(): Buffer {
    return xpubToHdPassphrase(this.masterHdNode.extendedPublicKey)
  }

  getDerivationScheme() {
    return this.derivationScheme
  }

  getVersion() {
    return null
  }

  isFeatureSupported(_feature: CryptoProviderFeature) {
    return true
  }

  ensureFeatureIsSupported(_feature: CryptoProviderFeature) {
    return true
  }

  deriveXpub(path: BIP32Path) {
    return this._deriveXpub(path)
  }

  // eslint-disable-next-line require-await
  async displayAddressForPath(_absDerivationPath: BIP32Path, _stakingPath: BIP32Path) {
    throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError, {
      message: 'Operation not supported',
    })
  }

  deriveHdNode(derivationPath: BIP32Path): _HdNode {
    return derivationPath.reduce(this.deriveChildHdNode.bind(this), this.masterHdNode)
  }

  deriveChildHdNode(hdNode: _HdNode, childIndex: number): _HdNode {
    const result = derivePrivate(hdNode.toBuffer(), childIndex, this.derivationScheme.ed25519Mode)

    return HdNode(result)
  }

  async _sign(message: HexString, keyDerivationPath: BIP32Path): Promise<Buffer> {
    const hdNode = await this.deriveHdNode(keyDerivationPath)
    const messageToSign = Buffer.from(message, 'hex')
    return signMsg(messageToSign, hdNode.toBuffer())
  }

  async prepareShelleyWitness(txHash: HexString, path: BIP32Path): Promise<TxShelleyWitness> {
    const signature = await this._sign(txHash, path)
    const xpub = await this.deriveXpub(path)
    const publicKey = xpub2pub(xpub)
    return {publicKey, signature}
  }

  async prepareWitnesses(
    txAux: TxAux,
    addressToAbsPathMapper: AddressToPathMapper,
    partial: boolean = false
  ): Promise<{
    shelleyWitnesses: TxShelleyWitness[]
    inputs: TxInput[]
    mint?: TokenBundle
    scripts?: TxScriptSource[]
    datums?: TxDatum[]
    redeemers?: TxRedeemer[]
  }> {
    const {
      inputs,
      collateralInputs,
      certificates,
      withdrawals,
      datums,
      scripts,
      redeemers,
      requiredSigners,
      mint,
    } = txAux
    const txHash = txAux.getId()
    const _shelleyWitnesses: Array<Promise<TxShelleyWitness>> = []

    /**
     * Only pubkey addresses need a signature.
     * Script addresses have datums, redeemers, scripts as witness.
     * For scripts, collateral inputs have to be provided.
     * Collateral inputs have to be ada-only pubkey addresses.
     */
    const shelleyInputs = [...inputs, ...(collateralInputs || [])].filter(({address}) => !!address) // filter out inputs with no address (scripts)

    const spendingKeyHashes = chain(shelleyInputs)
      .map((input) => input.address)
      .filter((address) => !hasSpendingScript(address))
      .map((address) => spendingHashFromAddress(address) as PubKeyHash)
      .value()
    const stakingKeyHashes = chain([...certificates, ...withdrawals])
      .map((entry) => entry.stakingAddress)
      .filter((address) => !hasStakingScript(addressToBuffer(address)))
      .map((address) => stakingHashFromAddress(address))
      .value()

    const shelleyAddresses = chain([
      ...spendingKeyHashes,
      ...stakingKeyHashes,
      ...(requiredSigners || []),
    ])
      .uniq()
      .value()

    shelleyAddresses.forEach((addrKeyHash) => {
      const path = addressToAbsPathMapper(addrKeyHash)
      if (!path || !isShelleyPath(path)) {
        if (partial) return
        throw new CabInternalError(CabInternalErrorReason.TxSignError, {
          message: path
            ? `Path does not match a shelley path: ${path}`
            : `Missing address key hash spending path: ${addrKeyHash}`,
        })
      }
      _shelleyWitnesses.push(this.prepareShelleyWitness(txHash, path))
    })

    const shelleyWitnesses: TxShelleyWitness[] = await Promise.all(_shelleyWitnesses)

    const scriptWitnesses = removeNullFields({datums, scripts, redeemers, mint})
    return {shelleyWitnesses, inputs, ...scriptWitnesses}
  }

  finalizeTxAuxWithMetadata(txAux: TxAux): TxAux {
    if (!(txAux.metadata && txAux.metadata.size > 0)) {
      return txAux
    }
    // copy the aux metadata to not overwrite txAux
    const metadata = new Map(txAux.metadata ? txAux.metadata.entries() : [])
    return new ShelleyTxAux({
      ...txAux,
      metadata,
      // NOTE there is no support for any additional auxiliary data
      auxiliaryDataHash: hashSerialized(metadata),
    })
  }

  async signTxGetStructured(
    txAux: TxAux,
    addressToPathMapper: AddressToPathMapper,
    partial: boolean = false
  ): Promise<CborizedTxStructured> {
    const finalizedTxAux = this.finalizeTxAuxWithMetadata(txAux)

    const witnesses = await this.prepareWitnesses(finalizedTxAux, addressToPathMapper, partial)
    const txWitnesses = cborizeTxWitnesses(witnesses)

    return ShelleyTransactionStructured(finalizedTxAux, txWitnesses)
  }

  async signTx(txAux: TxAux, addressToPathMapper: AddressToPathMapper): Promise<TxSigned> {
    const structuredTx = await this.signTxGetStructured(txAux, addressToPathMapper)
    const tx = {
      txBody: encode(structuredTx).toString('hex'),
      txHash: structuredTx.getId(),
    }
    return tx
  }

  async witnessTx(txAux: TxAux, addressToPathMapper: AddressToPathMapper): Promise<TxWitnessSet> {
    const structuredTx = await this.signTxGetStructured(txAux, addressToPathMapper, true)
    return structuredTx.getWitnessSet()
  }

  // eslint-disable-next-line require-await
  async witnessPoolRegTx(_txAux: TxAux, _addressToAbsPathMapper: AddressToPathMapper): Promise<any> {
    throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
  }

  signData(
    _address: Address,
    _data: HexString,
    _addressToAbsPathMapper: AddressToPathMapper
  ): Promise<DataSignature> {
    throw new UnexpectedError(UnexpectedErrorReason.UnsupportedOperationError)
  }
}
