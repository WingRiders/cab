import {AccountInfo} from '@/account/Account'
import {DEFAULT_TTL_SLOTS} from '@/constants'
import {ICryptoProvider} from '@/crypto/ICryptoProvider'
import {CabInternalError, CabInternalErrorReason} from '@/errors'
import {TxSigned} from '@/ledger/transaction'
import {IBlockchainExplorer, TxBlockInfo, TxSubmission} from '@/types/blockchainExplorer'
import {NetworkId} from '@/types/network'
import {ProtocolParameters} from '@/types/protocolParameters'
import {CryptoProviderFeature, DerivationScheme} from '@/types/wallet'

import {AccountManager} from './AccountManager'

type WalletConfig = {
  shouldExportPubKeyBulk: boolean
  gapLimit: number
}

type WalletParams = {
  blockchainExplorer: IBlockchainExplorer
  cryptoProvider: ICryptoProvider
  config: WalletConfig
}
export class Wallet {
  private blockchainExplorer: IBlockchainExplorer
  private cryptoProvider: ICryptoProvider
  private accountManager: AccountManager
  private protocolParameters: ProtocolParameters | null

  constructor({blockchainExplorer, cryptoProvider, config}: WalletParams) {
    this.blockchainExplorer = blockchainExplorer
    this.cryptoProvider = cryptoProvider

    this.accountManager = new AccountManager({
      config,
      cryptoProvider,
      blockchainExplorer,
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
    try {
      const {
        Right: {bestSlot},
      } = await this.blockchainExplorer.getBestSlot()
      return bestSlot + DEFAULT_TTL_SLOTS
    } catch (e) {
      throw new CabInternalError(CabInternalErrorReason.NetworkError, {causedBy: e})
    }
  }

  submitTx(signedTx: TxSigned): Promise<TxSubmission> {
    const params = {
      walletType: this.getWalletName(),
      walletVersion: this.cryptoProvider.getVersion(),
      walletDerivationScheme: this.cryptoProvider.getDerivationScheme().type,
      // TODO: add stake key for debugging purposes
    }
    const {txBody, txHash} = signedTx
    return this.blockchainExplorer.submitTxRaw(txHash, txBody, params)
  }

  getWalletSecretDef(): {rootSecret: Buffer | void; derivationScheme: DerivationScheme} {
    return {
      rootSecret: this.cryptoProvider.getSecret(),
      derivationScheme: this.cryptoProvider.getDerivationScheme(),
    }
  }

  fetchTxBlockInfo(txHash): Promise<TxBlockInfo | null> {
    return this.blockchainExplorer.fetchTxBlockInfo(txHash)
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

  async getPoolInfo(url) {
    const poolInfo = await this.blockchainExplorer.getPoolInfo(url)
    return poolInfo
  }

  async getProtocolParameters(): Promise<ProtocolParameters> {
    if (this.protocolParameters) {
      return Promise.resolve(this.protocolParameters)
    }
    try {
      const pparams = await this.blockchainExplorer.getProtocolParameters()
      this.protocolParameters = pparams
      return this.protocolParameters
    } catch (err) {
      throw new CabInternalError(CabInternalErrorReason.NetworkError, {causedBy: err})
    }
  }
}
