import type {
  CborAPI,
  JsAPI,
  StandardWallet as StandardWalletApi,
  Wallet as WalletApi,
} from '@/dappConnector'

import {CborToJsApiBridge} from './CborToJsApiBridge'
import {EternlToJsApiBridge} from './EternlToJsApiBridge'
import {NamiToJsApiBridge} from './NamiToJsApiBridge'
import {addTimeouts, PreTimeout} from './timeout'
import {TyphonToJsApiBridge} from './TyphonToJsApiBridge'
import {YoroiToJsApiBridge} from './YoroiToJsApiBridge'

/**
 * A thin wrapper around a standardized {@link WalletApi} that adds the method {@link enableJs}
 * which returns a compatibility layer between the wallet's {@link CborAPI} and our {@link JsAPI}.
 */
export class CborToJsApiWalletConnector implements WalletApi {
  readonly experimental: {readonly feeAddress: string | undefined}
  private cachedCborApiPromise?: Promise<CborAPI>
  private readonly config:
    | {
        vendor: 'eternl'
        cache: ReturnType<typeof EternlToJsApiBridge.createCache>
        cacheTtl: number
      }
    | {
        vendor: 'nami' | 'typhon' | 'yoroi' | null
      }
    | {
        vendor: 'wc'
        apiTimeoutMs: number
        apiPreTimeout?: PreTimeout
      }

  constructor(private wallet: StandardWalletApi, options: CborToJsApiWalletConnectorOptions) {
    this.config =
      options.vendor === 'eternl' ? {...options, cache: EternlToJsApiBridge.createCache()} : options

    this.experimental = {
      get feeAddress() {
        return options.vendor === 'eternl' ? wallet.experimental?.feeAddress : undefined
      },
    }
  }

  get icon(): string {
    return this.wallet.icon
  }

  get name(): string {
    return this.wallet.name
  }

  get apiVersion(): string {
    return this.wallet.apiVersion
  }

  // TODO add timeouts to all of these calls
  enable(): Promise<CborAPI> {
    const cborApiPromise = this.cachedCborApiPromise ?? this.wallet.enable()
    if (this.config.vendor === 'eternl' || this.config.vendor === 'wc') {
      this.cachedCborApiPromise = cborApiPromise
    }
    return cborApiPromise
  }

  async enableJs(): Promise<JsAPI> {
    const cborApi = await this.enable()
    switch (this.config.vendor) {
      case 'eternl':
        return new EternlToJsApiBridge(cborApi, this.config.cache, this.config.cacheTtl)
      case 'nami':
        return new NamiToJsApiBridge(cborApi)
      case 'wc':
        return addTimeouts(new CborToJsApiBridge(cborApi), {
          timeoutMs: this.config.apiTimeoutMs,
          preTimeouts: this.config.apiPreTimeout && [this.config.apiPreTimeout],
        })
      case 'typhon':
        return new TyphonToJsApiBridge(cborApi)
      case 'yoroi':
        return new YoroiToJsApiBridge(cborApi)
      default:
        return new CborToJsApiBridge(cborApi)
    }
  }

  isEnabled(): Promise<boolean> {
    return this.wallet.isEnabled()
  }

  invalidateCache(): void {
    this.cachedCborApiPromise = undefined

    if (this.config.vendor === 'eternl') {
      this.config.cache = EternlToJsApiBridge.createCache()
    }
  }
}

export type CborToJsApiWalletConnectorOptions =
  | {
      vendor: 'nami' | 'typhon' | 'yoroi' | null
    }
  | {
      vendor: 'eternl'
      cacheTtl: number
    }
  | {
      vendor: 'wc'
      apiTimeoutMs: number
      apiPreTimeout?: PreTimeout
    }
