import {TxSigned} from '@/ledger/transaction'
import {DerivationScheme, CryptoProviderFeature} from '@/types/wallet'
import {ProtocolParameters} from '@/types/protocolParameters'
import {NetworkId} from '@/types/network'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {DEFAULT_TTL_SLOTS} from '@/constants'
import {AccountManager} from './AccountManager'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {AccountInfo} from '@/account/Account'
import {
  ILedgerStateDataProvider,
  IOnChainDataProvider,
  ISubmitTxProvider,
  TxBlockInfo,
} from '@/dataProviders'

export class Wallet {
  private onChainDataProvider: IOnChainDataProvider
  private ledgerStateDataProvider: ILedgerStateDataProvider
  private submitTxProvider: ISubmitTxProvider
  private cryptoProvider: ICryptoProvider
  private accountManager: AccountManager
  private protocolParameters: ProtocolParameters | null

  constructor({
    onChainDataProvider,
    ledgerStateDataProvider,
    submitTxProvider,
    cryptoProvider,
    config,
  }: {
    onChainDataProvider: IOnChainDataProvider
    ledgerStateDataProvider: ILedgerStateDataProvider
    submitTxProvider: ISubmitTxProvider
    cryptoProvider: ICryptoProvider
    config: {
      shouldExportPubKeyBulk: boolean
      gapLimit: number
    }
  }) {
    this.onChainDataProvider = onChainDataProvider
    this.ledgerStateDataProvider = ledgerStateDataProvider
    this.submitTxProvider = submitTxProvider
    this.cryptoProvider = cryptoProvider

    this.accountManager = new AccountManager({
      config,
      cryptoProvider,
      onChainDataProvider,
      ledgerStateDataProvider,
    })
  }

  getNetworkId(): NetworkId {
    return this.cryptoProvider.network.networkId
  }

  getWalletName(): string {
    return this.cryptoProvider.getName()
  }

  isHwWallet(): boolean {
    return this.cryptoProvider.isHardwareSupported()
  }

  getAccountManager(): AccountManager {
    return this.accountManager
  }

  getAccount(index: number) {
    return this.accountManager.getAccount(index)
  }

  public async calculateTtl(): Promise<number> {
    const ledgerTip = await this.ledgerStateDataProvider.getLedgerTip()
    if (ledgerTip.origin) {
      return DEFAULT_TTL_SLOTS
    }
    return ledgerTip.slot + DEFAULT_TTL_SLOTS
  }

  submitTx(signedTx: TxSigned): Promise<{txHash: string}> {
    return this.submitTxProvider.submitTx(signedTx)
  }

  getWalletSecretDef(): {rootSecret: Buffer | void; derivationScheme: DerivationScheme} {
    return {
      rootSecret: this.cryptoProvider.getSecret(),
      derivationScheme: this.cryptoProvider.getDerivationScheme(),
    }
  }

  fetchTxBlockInfo(txHash: string): Promise<TxBlockInfo | null> {
    return this.onChainDataProvider.getTxBlockInfo(txHash)
  }

  ensureFeatureIsSupported(feature: CryptoProviderFeature) {
    try {
      // TODO: refactor this so it doesnt throw but return error object
      this.cryptoProvider.ensureFeatureIsSupported(feature)
    } catch (e) {
      return {code: e.name, params: {message: e.message}}
    }
    return null
  }

  async getBaseAccountsInfo(): Promise<AccountInfo[]> {
    const accounts = await this.accountManager.discoverAccounts() // discovers and loads accounts
    return accounts.map((account) => account.getAccountInfo())
  }

  getMaxAccountIndex() {
    return this.accountManager.getMaxAccountIndex()
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    if (this.protocolParameters) {
      return Promise.resolve(this.protocolParameters)
    }
    try {
      const pparams = await this.ledgerStateDataProvider.getProtocolParameters()
      this.protocolParameters = pparams
      return this.protocolParameters
    } catch (err) {
      throw new CabInternalError(CabInternalErrorReason.NetworkError, {causedBy: err})
    }
  }
}
