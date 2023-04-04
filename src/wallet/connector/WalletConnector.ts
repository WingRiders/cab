import {APIErrorCode, CborAPI, JsAPI, Wallet as WalletApi, WalletOptions} from '@/dappConnector'
import {Wallet} from '..'
import {ApiError} from './ApiError'
import {JsApi} from './JsApi'

export class WalletConnector implements WalletApi {
  private activeAccountIndex: number
  private jsApiInstance: JsApi | null
  public apiVersion: string

  constructor(private wallet: Wallet, public name: string, public icon: string) {
    this.activeAccountIndex = 0
    this.jsApiInstance = null
    this.apiVersion = '1.0.0'
  }

  public enable(_options?: WalletOptions): Promise<CborAPI> {
    throw new ApiError(APIErrorCode.InternalError, 'Method not implemented.')
  }

  public async enableJs(_options?: WalletOptions): Promise<JsAPI> {
    if (this.jsApiInstance) {
      return this.jsApiInstance
    }
    const account = this.wallet.getAccount(this.activeAccountIndex)

    this.jsApiInstance = new JsApi(this.wallet, await account.load())
    return this.jsApiInstance
  }

  public isEnabled(): Promise<boolean> {
    return Promise.resolve(true) // always allow
  }

  public setActiveAccountIndex(index: number) {
    if (index !== this.activeAccountIndex) {
      if (this.jsApiInstance !== null) {
        this.jsApiInstance.accountChanged()
        this.jsApiInstance = null
      }
      this.activeAccountIndex = index
    }
  }

  public async reloadActiveAccount(): Promise<void> {
    await this.wallet.getAccount(this.activeAccountIndex).reload()
  }
}
