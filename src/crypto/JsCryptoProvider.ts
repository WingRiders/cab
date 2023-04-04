/* eslint-disable no-use-before-define */
/* eslint-disable camelcase */
import {
  sign as signMsg,
  derivePrivate,
  xpubToHdPassphrase,
  base58,
  getBootstrapAddressAttributes,
  hasSpendingScript,
  addressToBuffer,
  hasStakingScript,
} from 'cardano-crypto.js'
import {encode} from 'borc'
import {chain, partition} from 'lodash'
import {
  Address,
  BIP32Path,
  HexString,
  Network,
  TxByronWitness,
  TxShelleyWitness,
  CryptoProviderFeature,
  PubKeyHash,
  TokenBundle,
  TxWitnessSet,
} from '@/types'
import {TxRedeemer, TxInput, TxScript, TxDatum, TxMetadatumLabel} from '@/types/transaction'
import {removeNullFields} from '@/helpers'

import HdNode, {_HdNode} from './helpers/hdNode'
import {
  ShelleyTransactionStructured,
  cborizeTxWitnesses,
  ShelleyTxAux,
  TxSigned,
  TxAux,
  CborizedTxStructured,
} from '@/ledger/transaction'

import {
  isShelleyFormat,
  isShelleyPath,
  spendingHashFromAddress,
  stakingHashFromAddress,
  xpub2ChainCode,
  xpub2pub,
} from '@/ledger/address'
import {CachedDeriveXpubFactory} from './helpers/CachedDeriveXpubFactory'
import {
  CabInternalError,
  CabInternalErrorReason,
  UnexpectedError,
  UnexpectedErrorReason,
} from '../errors'
import {AddressToPathMapper, DerivationScheme} from '@/types/wallet'
import {ICryptoProvider} from './ICryptoProvider'
import {hashSerialized} from '@/ledger/transaction/utils'
import {CatalystVotingRegistrationData} from '@/types/txPlan'
import {
  encodeVotingRegistrationData,
  encodeVotingSignature,
} from '@/ledger/transaction/metadata/encodeMetadata'

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

  async prepareByronWitness(
    txHash: HexString,
    path: BIP32Path,
    address: Address
  ): Promise<TxByronWitness> {
    const signature = await this._sign(txHash, path)
    const xpub = await this.deriveXpub(path)
    const publicKey = xpub2pub(xpub)
    const chainCode = xpub2ChainCode(xpub)
    // TODO: check if this works for testnet, apparently it doesnt
    const addressAttributes = encode(getBootstrapAddressAttributes(base58.decode(address)))
    return {publicKey, signature, chainCode, addressAttributes}
  }

  async prepareWitnesses(
    txAux: TxAux,
    addressToAbsPathMapper: AddressToPathMapper,
    partial: boolean = false
  ): Promise<{
    shelleyWitnesses: TxShelleyWitness[]
    byronWitnesses: TxByronWitness[]
    inputs: TxInput[]
    mint?: TokenBundle
    scripts?: TxScript[]
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
    const _byronWitnesses: Array<Promise<TxByronWitness>> = []

    /**
     * Only pubkey addresses need a signature.
     * Script addresses have datums, redeemers, scripts as witness.
     * For scripts, collateral inputs have to be provided.
     * Collateral inputs have to be ada-only pubkey addresses.
     */
    const allInputs = [...inputs, ...(collateralInputs || [])]
    const [shelleyInputs, byronInputs] = partition(
      allInputs.filter(({address}) => !!address), // filter out inputs with no address (scripts)
      ({address}) => isShelleyFormat(address)
    )
    const spendingKeyHashes = chain(shelleyInputs)
      .map((input) => input.address)
      .filter((address) => !hasSpendingScript(addressToBuffer(address)))
      .map((address) => spendingHashFromAddress(address) as PubKeyHash)
      .value()

    const byronAddresses = chain(byronInputs)
      .map((input) => input.address)
      .uniq()
      .value()

    const stakingKeyHashes = chain([...certificates, ...withdrawals])
      .map((entry) => entry.stakingAddress)
      .filter((address) => !hasStakingScript(addressToBuffer(address)))
      .map((address) => stakingHashFromAddress(address))
      .value()

    byronAddresses.forEach((address) => {
      const spendingPath = addressToAbsPathMapper(address)
      if (!spendingPath) {
        if (partial) return
        throw new CabInternalError(CabInternalErrorReason.TxSignError, {
          message: 'Missing byron spending path',
        })
      }
      _byronWitnesses.push(this.prepareByronWitness(txHash, spendingPath, address))
    })

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
            ? 'Path does not match a shelley path'
            : 'Missing address key hash spending path',
        })
      }
      _shelleyWitnesses.push(this.prepareShelleyWitness(txHash, path))
    })

    const shelleyWitnesses: TxShelleyWitness[] = await Promise.all(_shelleyWitnesses)
    const byronWitnesses: TxByronWitness[] = await Promise.all(_byronWitnesses)

    const scriptWitnesses = removeNullFields({datums, scripts, redeemers, mint})
    return {shelleyWitnesses, byronWitnesses, inputs, ...scriptWitnesses}
  }

  private async signCatalystVoting(votingData: CatalystVotingRegistrationData) {
    if (!votingData) throw new Error('No votingData found')
    //extract only the voting data part
    const data = encodeVotingRegistrationData(votingData)
    const votingMetadatum = new Map([[TxMetadatumLabel.CATALYST_VOTING_REGISTRATION_DATA, data]])
    const registrationDataHash = hashSerialized(votingMetadatum)
    const stakingPath = votingData.rewardDestinationAddress.stakingPath
    const registrationDataWitness = await this.prepareShelleyWitness(registrationDataHash, stakingPath)
    const signature = encodeVotingSignature(registrationDataWitness.signature.toString('hex'))
    return {
      data,
      signature,
    }
  }

  async finalizeTxAuxWithMetadata(txAux: TxAux): Promise<TxAux> {
    if (!txAux.votingData && !(txAux.metadata && txAux.metadata.size > 0)) {
      return txAux
    }
    // copy the aux metadata to not overwrite txAux
    const metadata = new Map(txAux.metadata ? txAux.metadata.entries() : [])
    if (txAux.votingData) {
      const {data, signature} = await this.signCatalystVoting(txAux.votingData)
      metadata.set(TxMetadatumLabel.CATALYST_VOTING_REGISTRATION_DATA, data)
      metadata.set(TxMetadatumLabel.CATALYST_VOTING_SIGNATURE, signature)
    }
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
    const finalizedTxAux = await this.finalizeTxAuxWithMetadata(txAux)

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
}
