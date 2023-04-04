import {Account} from '@/account'
import * as api from '@/dappConnector'
import {isRecommendedCollateral} from '@/helpers'
import {aggregateTokenBundles} from '@/ledger/assets'
import {sortUtxos} from '@/ledger/transaction'
import * as cab from '@/types'
import {pick} from 'lodash'
import {Wallet} from '..'
import {ApiError} from './ApiError'
import {
  normalizeAddress,
  normalizeAddressWithMeta,
  normalizeTxValue,
  normalizeUtxo,
  normalizeWitnessSet,
} from './normalize'
import {reverseTx} from './reverse'

export class JsApi implements api.JsAPI {
  private state: number

  constructor(private wallet: Wallet, private account: Account) {
    this.state = 0
  }

  public accountChanged() {
    this.state = api.APIErrorCode.AccountChange
  }

  private assertState() {
    if (this.state !== 0) {
      throw new ApiError(this.state, 'Invalid state.')
    }
  }

  getNetworkId(): Promise<api.NetworkId> {
    this.assertState()
    switch (this.wallet.getNetworkId()) {
      case cab.NetworkId.MAINNET:
        return Promise.resolve(api.NetworkId.Mainnet)
      case cab.NetworkId.PREPROD:
        return Promise.resolve(api.NetworkId.Testnet)
      default:
        throw new ApiError(api.APIErrorCode.InternalError, 'Unknown network')
    }
  }

  async getUtxos(options?: api.UtxoFilterOptions): Promise<api.TxUnspentOutput[]> {
    this.assertState()
    if (options?.amount || options?.paginate) {
      throw new ApiError(api.APIErrorCode.InternalError, 'Feature not implemented.')
    }
    let utxos = this.account.getUtxos().map(normalizeUtxo)
    if (options?.withoutCollateral) {
      const collaterals = await this.getCollateral()
      if (collaterals && collaterals.length > 0) {
        const collateral = collaterals[0]
        utxos = utxos.filter(
          (utxo) =>
            utxo.txInput.txHash !== collateral.txInput.txHash ||
            utxo.txInput.index !== collateral.txInput.index
        )
      }
    }
    return utxos
  }

  getCollateral(): Promise<api.TxUnspentOutput[]> {
    this.assertState()
    const utxos = this.account.getUtxos()
    const collateralUtxos = sortUtxos(utxos.filter(isRecommendedCollateral))
    //return at most a single collateral whose value is larger than 3
    return Promise.resolve(collateralUtxos.slice(0, 1).map(normalizeUtxo))
  }

  getBalance(partialValue?: api.Value): Promise<api.Value> {
    this.assertState()
    if (partialValue) {
      throw new ApiError(api.APIErrorCode.InternalError, 'Feature not implemented.')
    }
    let coins = new cab.BigNumber(0)
    const tokenBundles: cab.TokenBundle[] = []
    this.account.getUtxos().forEach((utxo) => {
      coins = coins.plus(utxo.coins)
      tokenBundles.push(utxo.tokenBundle)
    })
    return Promise.resolve(
      normalizeTxValue<api.UInt>(aggregateTokenBundles(tokenBundles), coins as cab.Lovelace)
    )
  }

  getUsedAddresses(paginate?: api.Paginate): Promise<api.Address[]> {
    this.assertState()
    if (paginate) {
      throw new ApiError(api.APIErrorCode.InternalError, 'Feature not implemented.')
    }
    return Promise.resolve(this.account.getAccountInfo().usedAddresses.map(normalizeAddressWithMeta))
  }

  getUnusedAddresses(): Promise<api.Address[]> {
    this.assertState()
    return Promise.resolve(this.account.getAccountInfo().unusedAddresses.map(normalizeAddressWithMeta))
  }

  getChangeAddress(): Promise<api.Address> {
    this.assertState()
    return Promise.resolve(normalizeAddress(this.account.getChangeAddress()))
  }

  getRewardAddresses(): Promise<api.Address[]> {
    this.assertState()
    return Promise.resolve([normalizeAddress(this.account.getStakingAddress())])
  }

  async signTx(
    tx: api.Transaction,
    txHash: api.TxHash,
    _options?: api.SignTxOptions
  ): Promise<api.TxWitnessSet> {
    this.assertState()
    const txAux = reverseTx(tx, this.account.getUtxos())
    if (txAux.getId() !== txHash) {
      throw new ApiError(api.APIErrorCode.InternalError, `TxHash doesn't match`)
    }
    const witnessSet = normalizeWitnessSet(await this.account.witnessTxAux(txAux), txAux)
    // only return signatures
    const signatures = pick(witnessSet, ['vKeyWitnesses', 'bootstrapWitness'])
    return signatures
  }

  signData(_addr: api.Address, _sigStructure: api.HexString): Promise<api.HexString> {
    this.assertState()
    throw new ApiError(api.APIErrorCode.InternalError, 'Method not implemented.')
  }

  submitTx(_tx: api.Transaction): Promise<api.TxHash> {
    this.assertState()
    throw new ApiError(api.APIErrorCode.InternalError, 'Method not implemented.')
  }

  async submitRawTx(tx: api.HexString, txHash: api.TxHash): Promise<api.TxHash> {
    this.assertState()
    try {
      const submission = await this.wallet.submitTx({txBody: tx, txHash})
      return submission.txHash as api.TxHash
    } catch (err) {
      throw new ApiError(api.APIErrorCode.InternalError, err.message)
    }
  }
}
