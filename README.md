<p align="center"><img src="https://assets.wingriders.com/wingriders_logo.png" /></p>

# @wingriders/cab

**CAB (Cardano Application Backend)** is a powerful library designed to streamline the development of Cardano applications for both browser and Node.js environments.

## Features

CAB provides essential tools for:

- **Wallet & Account Management** – Securely manage Cardano wallets and accounts.
- **Custom Data Sources** – Define and integrate blockchain data providers.
- **Cryptographic Utilities** – Generate mnemonics and derive keys.
- **CIP-30 dApp Connector** – Easily connect with Cardano dApps.
- **Transaction Planning** – Build Plutus-compatible transactions with metadata and automatic UTxO selection.
- **Plutus V1 & V2 Support** – Compatible with both Plutus versions.

## Installation

### Using Yarn

```sh
yarn add @wingriders/cab
```

### Using npm

```sh
npm install @wingriders/cab
```

## Development Roadmap

- [ ] Add comprehensive documentation
- [x] Support Plutus V2
- [ ] Improve transaction planner
- [x] Open-source data providers
- [ ] Enhance error reporting and helper functions
- [ ] Expand test coverage
- [ ] Add ES Modules support

## Basic Usage

CAB offers a wide range of functionalities. Below are some basic examples to help you get started.

### Account Management

Manage a wallet using a mnemonic phrase.

```ts
import {NETWORKS} from '@wingriders/cab/constants'
import {JsCryptoProvider, mnemonicToWalletSecretDef} from '@wingriders/cab/crypto'
import {CabBackend} from '@wingriders/cab/dataProvider'
import {NetworkName} from '@wingriders/cab/types/network'
import {Wallet} from '@wingriders/cab/wallet'

const dataProvider = new CabBackend('https://cab-server.mainnet.wingriders.com', NetworkName.MAINNET)

const wallet = new Wallet({
  dataProvider,
  cryptoProvider: new JsCryptoProvider({
    // Here we assume the mnemonic is in a variable called `secretMnemonic`
    // for example loaded from the environment variables
    walletSecretDef: await mnemonicToWalletSecretDef(secretMnemonic),
    network: NETWORKS[NetworkName.MAINNET],
    config: {
      shouldExportPubKeyBulk: true,
    },
  }),
  gapLimit: 20,
})

const account = await wallet.getOrLoadAccount(0)
const utxos = account.getUtxos()
```

### Transaction Planner

Send 10 ADA to Alice using a planned transaction.

```ts
import {getTxPlan} from '@wingriders/cab/ledger/transaction'
import {Lovelace, TxPlanArgs} from '@wingriders/cab/types'

// Obtain the protocol parameters from your ledger state provider
const protocolParameters = await dataProvider.getProtocolParameters()

// Define the plan of the transaction
const txPlanArgs: TxPlanArgs = {
  planId: 'send-ada-to-Alice',
  outputs: [
    {
      address: 'addr1z8n...u6v8',
      coins: new Lovelace(10_000_000) as Lovelace,
      tokenBundle: [],
    },
  ],
  protocolParameters,
}

// Try to create the transaction plan, using available utxos in your account
// and send the change to your account's change address
const txPlanResult = getTxPlan(txPlanArgs, account.getUtxos(), account.getChangeAddress())

if (!txPlanResult.success) {
  console.error(txPlanResult.error)
  process.exit(1)
}

// Sign the transaction using your account and submit the transaction
// via your wallet's dataProvider
const txAux = prepareTxAux(txPlanResult.txPlan)
const signedTx = await account.signTxAux(txAux)
console.log(`Submitting transaction ${signedTx.txHash}`)
await wallet.submitTx(signedTx.txBody)
```
