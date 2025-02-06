import {BigNumber} from 'bignumber.js'
import {decode, encode, Tagged} from 'borc'
import {chain} from 'lodash'

import type {
  Address,
  CborAPI,
  CborHexString,
  DataSignature,
  HexString,
  JsAPI,
  NetworkId,
  Paginate,
  SignTxOptions,
  Transaction,
  TxHash,
  TxUnspentOutput,
  TxWitnessSet,
  UtxoFilterOptions,
  Value,
} from '@/dappConnector'
import {MAX_COLLATERAL_AMOUNT, optionalFields} from '@/helpers'
import {valueToLovelace} from '@/ledger/assets'
import {CborizedTxStructured, ShelleyTransactionStructured, TxWitnessKey} from '@/ledger/transaction'
import {cborizeNormalizedTxValue, cborizeTxWitnesses} from '@/ledger/transaction/cbor/cborize'

import {BridgeError} from './BridgeError'
import {DecodedValue, parseCborHexUtxo, parseValue, parseVKeyWitnesses} from './parse'
import {reverseTx, reverseValue, reverseVKeyWitnesses} from './reverse'

const REQUESTED_COLLATERAL_LOVELACE = new BigNumber(MAX_COLLATERAL_AMOUNT)

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

  protected findCollateralGetter(): CborAPI['getCollateral'] {
    return (
      this.cborApi.getCollateral?.bind(this.cborApi) ||
      this.cborApi.experimental?.getCollateral?.bind(this.cborApi.experimental)
    )
  }

  protected async getRawCollateral(): Promise<CborHexString[]> {
    const getCollateral = this.findCollateralGetter()

    if (
      typeof getCollateral === 'function' &&
      // skip if balance too low
      valueToLovelace(reverseValue(await this.getBalance())).gte(REQUESTED_COLLATERAL_LOVELACE)
    ) {
      const amount = encode(REQUESTED_COLLATERAL_LOVELACE).toString('hex') as CborHexString
      const collaterals = await getCollateral({amount})
      if (collaterals != null && !Array.isArray(collaterals)) {
        throw new BridgeError(
          `getCollateral returned ${String(collaterals)}, expected array, null or undefined!`
        )
      }
      return collaterals ?? []
    }

    return []
  }

  async getCollateral(): Promise<TxUnspentOutput[] | undefined> {
    this.assertState()

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

    return optionalFields({
      vKeyWitnesses:
        vKeyWitnesses &&
        parseVKeyWitnesses(vKeyWitnesses instanceof Tagged ? vKeyWitnesses.value : vKeyWitnesses),
    })
  }

  signData(address: Address, data: HexString): Promise<DataSignature> {
    this.assertState()

    return this.cborApi.signData(address as string as CborHexString, data as CborHexString)
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
    shelleyWitnesses: reverseVKeyWitnesses(tx.witnessSet.vKeyWitnesses ?? []),
    scripts: txAux.scripts,
    datums: txAux.datums,
    redeemers: txAux.redeemers,
    inputs: txAux.inputs,
    mint: txAux.mint,
  })
  return ShelleyTransactionStructured(txAux, witnessSet)
}
