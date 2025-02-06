# Dapp connector

This section defines an interface a dapp would expect from a wallet.
The standard is described in [CIP-0030](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0030) and we follow the
[alonzo cddl](https://github.com/input-output-hk/cardano-ledger/blob/45e402646e99e3c44720a2f9bc1938a11200e8df/eras/alonzo/test-suite/cddl-files/alonzo.cddl).

The naming conventions for types follow the conventions from the CIP

## Deviations compared to the standard

### Wallet Api

The standard doesn't offer any options pushed towards the wallet from the dapp.
For now we assume, that the `enable*` function could carry some payload.
The payloads purpose is still under consideration.

Potential use cases:

- permission scoping (e.g. hide NFTs)
- metadata taylored for wallets (e.g. icons, description)
- request a specific API version

### CBOR Api

Will keep following the CIP standard. The JS api should be backwards compatible with this.

### JS API

Supports a js typed format over cborized strings.
Cbor might cause compatibility issues ironically (e.g.: strings, bignumber; infinite array, strict arrays).

`getUtxos`
Canonical ordering of Utxos is not specified in the specs. Here we assume 2 possible
implementations:

- sorting canonically as inputs in transactions on `[txHash, outputIndex]` lexical sort of txHash, numerical for index
- oldest first - more optimal when interacting with DBs

`value`
instead of storing coins and multiasset separately, the component uses a single map to represent values.
Since the ordering of policies needs to be canonical in some situations, the connector uses
`Map` instead of plain objects.

`getBalance`
Is dangerous and expensive if a large amount of NFTs are on the account.
The JS api specifies an optional parameter to specify an incomplete `Value` type,
which should be used to filter out only these assets. E.g. if the dapp only cares about the ADA balance:
`getBalance(new Map(['', new Map(['',1])]))` (since ADA is represented as empty policyId and empty tokenName).

`signTx`
When the wallet receives the raw transaction to be signed, it would be rather inconvenient for the
user to see the raw transaction. When it comes to dapps and their datums, it's hardly readable.
The type definitions add a third optional parameter to allow the dapp to provide a summary.
For example, when a datum in the contract contains a deadline in POSIXTime, the dapp could
provide a field in the summary with a formatted datum.

## Disclaimers

It's discouraged to use the amount filtering for `getUtxos`. The standard only specifies that the asset
quantities should add up to a specified amount, but does not specify guarantees that for the same query it
would return the same utxos between calls. This could lead to unpredictable behaviour
(e.g. with retry logic).

## Future work

Provide a translation layer from cbor -> json and vice versa to support
other wallets.

This component should be separated to its own npm package. For now it's part
of the Cardano Application Backend (dapp library) out of convenience and copied here,
since for now the DEX dapp will be dynamically loaded.

According to the standard the Wallet API should throw an `APIError`
with `AccountChanged` code instead of providing callbacks to these events.
These callbacks might still be added if a good use-case comes up.
