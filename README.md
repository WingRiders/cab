<p align="center"><img src="https://assets.wingriders.com/wingriders_logo.png" /></p>

# @wingriders/cab

CAB (Cardano Application Backend) is a library, that helps you with development of Cardano apps for browser and Node.js. It can help with:

- Wallet and Account management
- Ability to define custom data sources for blockchain data
- Crypto helpers to generate new mnemonics and derive public and private keys
- CIP-30 dApp connector helpers
- A transaction planner with Plutus, metadata support and automatic UTxO selection

## Get started

### yarn

```sh
yarn add @wingriders/cab
```

### npm

```sh
npm i @wingriders/cab
```

## Development roadmap

* [ ] Add documentation
* [ ] Add support for Plutus V2
* [ ] Refine transaction planner
* [ ] Open-source data providers
* [ ] Clean up helpers and error reporting
* [ ] Refine tests
* [ ] ES Modules support

## Basic usage

CAB has many functionalities, which we are working on documentating. These are just basic examples of how you may use the library.

### Account management
An account belongs to a wallet, that is defined mainly by the wallet's secret key - mnemonic.
```ts
import {NETWORKS} from '@wingriders/cab/constants'
import {JsCryptoProvider, mnemonicToWalletSecretDef} from '@wingriders/cab/crypto'
import {NetworkName} from '@wingriders/cab/types/network'
import {Wallet} from '@wingriders/cab/wallet'

// Here we assume the `onChainDataProvider`, `ledgerStateProvider` and
// `submitTxProvider` are already defined. We are working on open-source
// implementation of these. In the meantime you can bring your own that
// adheres to the defined interfaces - see src/dataProviders/types.ts

const wallet = new Wallet({
  onChainDataProvider,
  ledgerStateDataProvider,
  submitTxProvider,
  cryptoProvider: new JsCryptoProvider({
    // Here we assume the mnemonic is in a variable called `secretMnemonic`
    // for example loaded from the environment variables
    walletSecretDef: await mnemonicToWalletSecretDef(secretMnemonic),
    network: NETWORKS[NetworkName.MAINNET],
    config: {
      shouldExportPubKeyBulk: true,
    },
  }),
  config: {
    shouldExportPubKeyBulk: true,
    gapLimit: 20,
  },
})

// Load the first account - account with index 0
await wallet.getAccountManager().addAccounts([0])

// Get the first account
const account = wallet.getAccountManager().getAccount(0)
```

### Transaction planner

To create a basic transaction for sending 10 ADA to Alice, from account we loaded in previous step
```ts
import {getTxPlan} from '@wingriders/cab/ledger/transaction'
import {TxPlanArgs} from '@wingriders/cab/types'

// Obtain the protocol parameters from your ledger state provider
const protocolParameters = await ledgerStateProvider.getProtocolParameters()

// Define the plan of the transaction
const txPlanArgs: TxPlanArgs = {
  planId: 'send-ada-to-Alice',
  outputs: [
    {
      address: "addr1z8n...u6v8",
      coins: new Lovelace(10_000_000) as Lovelace,
    },
  ],
  protocolParameters,
}

// Try to create the transaction plan, using available utxos in your account
// and send the change to your account's change address
const txPlanResult = getTxPlan(txPlanArgs, account.getUtxos(), account.getChangeAddress())

if (!txPlanResult.success) {
  // If it failed report the reasons why, for avaible fiels refer to the
  // `TxPlanResult` type
  return
}

// Sign the transaction using your account and submit the transaction
// via your wallet's SubmitTxProvider
const txAux = prepareTxAux(txPlanResult.txPlan)
const signedTx = await account.signTxAux(txAux)
await wallet.submitTx(signedTx)

// If needed feel free to track your transaction submission here
```
