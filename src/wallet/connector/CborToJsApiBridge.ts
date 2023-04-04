import {
  NetworkId,
  Value,
  Paginate,
  TxUnspentOutput,
  Address,
  Transaction,
  TxHash,
  SignTxOptions,
  TxWitnessSet,
  HexString,
  CborAPI,
  CborHexString,
  JsAPI,
  UtxoFilterOptions,
} from '@/dappConnector'
import {decode, encode} from 'borc'
import {BigNumber} from 'bignumber.js'
import {CborizedTxStructured, ShelleyTransactionStructured, TxWitnessKey} from '@/ledger/transaction'
import {cborizeTxWitnesses, cborizeNormalizedTxValue} from '@/ledger/transaction/cbor/cborize'
import {reverseBootstrapWitness, reverseTx, reverseVKeyWitnesses} from './reverse'
import {
  parseValue,
  DecodedValue,
  parseVKeyWitnesses,
  parseBootstrapWitnesses,
  parseCborHexUtxo,
} from './parse'
import {BridgeError} from './BridgeError'
import {optionalFields} from '@/helpers'
import {chain} from 'lodash'

/**
 * A compatibility layer between a standardized {@link CborAPI} and our {@link JsAPI}.
 */
export class CborToJsApiBridge implements JsAPI {
  constructor(protected cborApi: CborAPI) {} // eslint-disable-line no-empty-function

  protected assertState(): void {
    // pass
  }

  getNetworkId(): Promise<NetworkId> {
    this.assertState()

    return this.cborApi.getNetworkId()
  }

  async getUtxos(options?: UtxoFilterOptions): Promise<TxUnspentOutput[] | undefined> {
    this.assertState()

    const encodedValue =
      options?.amount &&
      (encode(cborizeNormalizedTxValue(options?.amount)).toString('hex') as CborHexString)

    const utxos = await this.cborApi.getUtxos(encodedValue, options?.paginate)

    if (utxos != null && !Array.isArray(utxos)) {
      throw new BridgeError(`getUxos returned ${String(utxos)}, expected array, null or undefined!`)
    }

    const collateralUtxos = (!options?.withoutCollateral && (await this.getRawCollateral())) || []

    return chain(utxos ?? [])
      .concat(collateralUtxos)
      .uniq()
      .map(parseCborHexUtxo)
      .value()
  }

  protected async getRawCollateral(): Promise<CborHexString[] | null | undefined> {
    // attempt to load collaterals from the experimental apis
    const getCollateral = this.cborApi.getCollateral || this.cborApi.experimental?.getCollateral

    if (typeof getCollateral === 'function') {
      try {
        const collaterals = await getCollateral()
        if (collaterals != null && !Array.isArray(collaterals)) {
          throw new BridgeError(
            `getCollateral returned ${String(collaterals)}, expected array, null or undefined!`
          )
        }
        return collaterals
      } catch (e) {
        const isTyphonCollateralNotFoundError = e.code === -2 && e.info === 'Collateral utxo not found!'
        if (!isTyphonCollateralNotFoundError) {
          throw e
        }
      }
    }
    return undefined
  }

  async getCollateral(): Promise<TxUnspentOutput[] | undefined> {
    return (await this.getRawCollateral())?.map(parseCborHexUtxo)
  }

  async getBalance(): Promise<Value> {
    this.assertState()

    const decoded: DecodedValue = decode(await this.cborApi.getBalance())

    if (!Array.isArray(decoded) && !(decoded instanceof BigNumber) && typeof decoded !== 'number') {
      throw new BridgeError(
        `getBalance returned ${String(decoded)}, expected number, BigNumber or array!`
      )
    }

    return parseValue(decoded)
  }

  // The following 4 address methods contain a type cast that is safe because the cbor api
  // actually returns hex-encoded addresses, not cbor-encoded ones.

  getUsedAddresses(paginate?: Paginate): Promise<Address[] | undefined> {
    this.assertState()

    const promise = this.cborApi.getUsedAddresses(paginate)
    return promise as Promise<string[] | undefined> as Promise<Address[] | undefined>
  }

  getUnusedAddresses(): Promise<Address[]> {
    this.assertState()

    return this.cborApi.getUnusedAddresses() as Promise<string[]> as Promise<Address[]>
  }

  getChangeAddress(): Promise<Address> {
    this.assertState()

    return this.cborApi.getChangeAddress() as Promise<string> as Promise<Address>
  }

  getRewardAddresses(): Promise<Address[]> {
    this.assertState()

    return this.cborApi.getRewardAddresses() as Promise<string[]> as Promise<Address[]>
  }

  async signTx(tx: Transaction, _?: TxHash, options?: SignTxOptions): Promise<TxWitnessSet> {
    this.assertState()

    const encodedTx = encode(cborizeTx(tx)).toString('hex') as CborHexString
    const decoded = decode(await this.cborApi.signTx(encodedTx, options?.partialSign))

    if (!(decoded instanceof Map)) {
      throw new BridgeError(`signTx returned ${String(decoded)}, expected a Map!`)
    }

    const vKeyWitnesses = decoded.get(TxWitnessKey.SHELLEY)
    const bootstrapWitnesses = decoded.get(TxWitnessKey.BYRON)

    return optionalFields({
      vKeyWitnesses: vKeyWitnesses && parseVKeyWitnesses(vKeyWitnesses),
      bootstrapWitness: bootstrapWitnesses && parseBootstrapWitnesses(bootstrapWitnesses),
    })
  }

  signData(addr: Address, sigStructure: HexString): Promise<HexString> {
    this.assertState()

    return this.cborApi.signData(addr as string as CborHexString, sigStructure as CborHexString)
  }

  submitTx(tx: Transaction): Promise<TxHash> {
    this.assertState()

    const encodedTx = encode(cborizeTx(tx)).toString('hex') as CborHexString
    return this.cborApi.submitTx(encodedTx) as Promise<TxHash>
  }

  submitRawTx(tx: HexString, _?: TxHash): Promise<TxHash> {
    this.assertState()

    return this.cborApi.submitTx(tx as CborHexString) as Promise<TxHash>
  }
}

const cborizeTx = (tx: Transaction): CborizedTxStructured => {
  // txAux inputs will have wrong address, coins and token bundle
  // but encoding ignores those, it just uses tx hash and output index (which stay correct)
  const txAux = reverseTx(tx, [])
  const witnessSet = cborizeTxWitnesses({
    byronWitnesses: reverseBootstrapWitness(tx.witnessSet.bootstrapWitness ?? []),
    shelleyWitnesses: reverseVKeyWitnesses(tx.witnessSet.vKeyWitnesses ?? []),
    scripts: txAux.scripts,
    datums: txAux.datums,
    redeemers: txAux.redeemers,
    inputs: txAux.inputs,
    mint: txAux.mint,
  })
  return ShelleyTransactionStructured(txAux, witnessSet)
}
