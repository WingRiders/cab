import {APIErrorCode, CborAPI, TxUnspentOutput, UtxoFilterOptions} from '@/dappConnector'

import {ApiError} from './ApiError'
import {BridgeError} from './BridgeError'
import {CborToJsApiBridge} from './CborToJsApiBridge'

export class NamiToJsApiBridge extends CborToJsApiBridge {
  private errorState?: APIErrorCode.AccountChange

  constructor(...args: ConstructorParameters<typeof CborToJsApiBridge>) {
    super(...args)

    NamiToJsApiBridge.addEventListenerOnce(this.cborApi, ['accountChange', 'networkChange'], () => {
      this.errorState = APIErrorCode.AccountChange
    })
  }

  protected override assertState(): void {
    switch (this.errorState) {
      case APIErrorCode.AccountChange:
        throw new ApiError(APIErrorCode.AccountChange, 'Nami wallet account or network has changed.')
      default:
      // pass
    }
  }

  private static addEventListenerOnce(cborApi: CborAPI, events: string[], onChange: () => void): void {
    const api: any = cborApi

    if (typeof api.experimental?.on !== 'function') {
      throw new BridgeError(`Could not find Nami's on() event method.`)
    }
    if (typeof api.experimental?.off !== 'function') {
      throw new BridgeError(`Could not find Nami's off() event method.`)
    }

    events.forEach((event) => {
      const handler = () => {
        onChange()
        api.experimental.off(event, handler)
      }
      api.experimental.on(event, handler)
    })
  }

  public override getUtxos(options?: UtxoFilterOptions): Promise<TxUnspentOutput[] | undefined> {
    // Nami is unable to sign transactions with his collateral as input, so do not include
    // collaterals that Nami is filtering out itself.
    return super.getUtxos({...options, withoutCollateral: true})
  }
}
