import {Tagged} from 'borc'
import {base58, bech32} from 'cardano-crypto.js'
import {compact, partition} from 'lodash'
import sortBy from 'lodash/sortBy'

import * as api from '@/dappConnector'
import {AdaAssetName, AdaPolicyId} from '@/dappConnector'
import {UnexpectedError, UnexpectedErrorReason} from '@/errors'
import {ipv4AddressToBuf, ipv6AddressToBuf} from '@/helpers/ipHelpers'
import {isShelleyFormat} from '@/ledger/address/addressHelpers'
import {orderTokenBundle} from '@/ledger/assets/tokenFormatter'
import {AddrKeyHash} from '@/types/address'
import {Lovelace, TokenBundle} from '@/types/base'
import {TxRelayType} from '@/types/stakepool'
import {
  Language,
  TxByronWitness,
  TxCertificate,
  TxCertificateType,
  TxDatum,
  TxDatumOption,
  TxDatumOptionType,
  TxDelegationCert,
  TxInput,
  TxInputRef,
  TxOutput,
  TxOutputType,
  TxRedeemer,
  TxRedeemerTag,
  TxScriptSource,
  TxShelleyWitness,
  TxStakepoolRegistrationCert,
  TxStakingKeyDeregistrationCert,
  TxStakingKeyRegistrationCert,
  TxWithdrawal,
} from '@/types/transaction'

import {CborInt64} from './CborInt64'
import {
  CborizedDatumOption,
  CborizedPubKeyHash,
  CborizedTxCertificate,
  CborizedTxDelegationCert,
  CborizedTxInput,
  CborizedTxOutput,
  CborizedTxRedeemer,
  CborizedTxScript,
  CborizedTxStakeCredential,
  CborizedTxStakepoolRegistrationCert,
  CborizedTxStakingKeyDeregistrationCert,
  CborizedTxStakingKeyRegistrationCert,
  CborizedTxTokenBundle,
  CborizedTxValue,
  CborizedTxWithdrawals,
  CborizedTxWitnessByron,
  CborizedTxWitnesses,
  CborizedTxWitnessShelley,
  TxCertificateKey,
  TxOutputKey,
  TxStakeCredentialType,
  TxWitnessKey,
} from './cborizedTx'
import {CborizedTxDatum} from './CborizedTxDatum'
import {CborizedTxInlineDatum} from './CborizedTxInlineDatum'
import {CborizedTxScriptRef} from './CborizedTxScriptRef'

const orderedInputSet = (inputs: CborizedTxInput[]) =>
  sortBy(inputs, [(input) => input[0].toString('hex'), 1])

export function cborizeTxInputs(inputs: TxInputRef[]): CborizedTxInput[] {
  const txInputs: CborizedTxInput[] = inputs.map(({txHash, outputIndex}) => {
    const txId = Buffer.from(txHash, 'hex')
    return [txId, outputIndex]
  })
  return orderedInputSet(txInputs)
}

export function cborizeTxOutputTokenBundle(
  tokenBundle: TokenBundle,
  allowNegative = false
): CborizedTxTokenBundle {
  const policyIdMap = new Map<Buffer, Map<Buffer, CborInt64>>()
  const orderedTokenBundle = orderTokenBundle(tokenBundle)
  orderedTokenBundle.forEach(({policyId, assets}) => {
    const assetMap = new Map<Buffer, CborInt64>()
    assets
      .filter(({quantity}) => (allowNegative ? !quantity.isZero() : quantity.gt(0)))
      .forEach(({assetName, quantity}) => {
        assetMap.set(Buffer.from(assetName, 'hex'), new CborInt64(quantity))
      })
    if (assetMap.size > 0) {
      policyIdMap.set(Buffer.from(policyId, 'hex'), assetMap)
    }
  })
  return policyIdMap
}

function cborizeTxValue(coins: Lovelace, tokenBundle: TokenBundle = []): CborizedTxValue {
  const cborizedCoins = new CborInt64(coins)
  const amount: CborizedTxValue =
    tokenBundle.length > 0 ? [cborizedCoins, cborizeTxOutputTokenBundle(tokenBundle)] : cborizedCoins
  return amount
}

export function cborizeSingleTxOutput(output: TxOutput): CborizedTxOutput {
  const value = cborizeTxValue(output.coins, output.tokenBundle)
  // TODO: we should have one fn for decoding
  const addressBuff: Buffer = isShelleyFormat(output.address)
    ? bech32.decode(output.address).data
    : base58.decode(output.address)
  if (output.type === TxOutputType.LEGACY) {
    return output.datumHash
      ? [addressBuff, value, Buffer.from(output.datumHash, 'hex')]
      : [addressBuff, value]
  }
  return new Map<TxOutputKey, Buffer | CborizedTxValue | CborizedDatumOption | CborizedTxScriptRef>([
    [TxOutputKey.OUTPUT_KEY_ADDRESS, addressBuff],
    [TxOutputKey.OUTPUT_KEY_VALUE, value],
    ...(output.datumOption
      ? ([[TxOutputKey.OUTPUT_KEY_DATUM_OPTION, cborizeTxDatumOption(output.datumOption)]] as const)
      : []),
    ...(output.scriptRef
      ? ([[TxOutputKey.OUTPUT_KEY_SCRIPT_REF, new CborizedTxScriptRef(output.scriptRef)]] as const)
      : []),
  ])
}

export function cborizeTxOutputs(outputs: TxOutput[]): CborizedTxOutput[] {
  const txOutputs: CborizedTxOutput[] = outputs.map(cborizeSingleTxOutput)
  return txOutputs
}

export function cborizeRequiredSigners(signers: AddrKeyHash[]): CborizedPubKeyHash[] {
  const txSigners: CborizedPubKeyHash[] = signers.map((signer) => Buffer.from(signer, 'hex'))
  return txSigners
}

function cborizeStakingKeyRegistrationCert(
  certificate: TxStakingKeyRegistrationCert
): CborizedTxStakingKeyRegistrationCert {
  const stakingKeyHash: Buffer = bech32.decode(certificate.stakingAddress).data.slice(1)
  const stakeCredential: CborizedTxStakeCredential = [TxStakeCredentialType.ADDR_KEYHASH, stakingKeyHash]
  return [TxCertificateKey.STAKING_KEY_REGISTRATION, stakeCredential]
}

function cborizeStakingKeyDeregistrationCert(
  certificate: TxStakingKeyDeregistrationCert
): CborizedTxStakingKeyDeregistrationCert {
  const stakingKeyHash: Buffer = bech32.decode(certificate.stakingAddress).data.slice(1)
  const stakeCredential: CborizedTxStakeCredential = [TxStakeCredentialType.ADDR_KEYHASH, stakingKeyHash]
  return [TxCertificateKey.STAKING_KEY_DEREGISTRATION, stakeCredential]
}

function cborizeDelegationCert(certificate: TxDelegationCert): CborizedTxDelegationCert {
  const stakingKeyHash: Buffer = bech32.decode(certificate.stakingAddress).data.slice(1)
  const stakeCredential: CborizedTxStakeCredential = [TxStakeCredentialType.ADDR_KEYHASH, stakingKeyHash]
  const poolHash = Buffer.from(certificate.poolHash, 'hex')
  return [TxCertificateKey.DELEGATION, stakeCredential, poolHash]
}

function cborizeStakepoolRegistrationCert(
  certificate: TxStakepoolRegistrationCert
): CborizedTxStakepoolRegistrationCert {
  const {poolRegistrationParams} = certificate
  return [
    TxCertificateKey.STAKEPOOL_REGISTRATION,
    Buffer.from(poolRegistrationParams.poolKeyHashHex, 'hex'),
    Buffer.from(poolRegistrationParams.vrfKeyHashHex, 'hex'),
    new CborInt64(poolRegistrationParams.pledgeStr),
    new CborInt64(poolRegistrationParams.costStr),
    new Tagged(
      30,
      [
        parseInt(poolRegistrationParams.margin.numeratorStr, 10),
        parseInt(poolRegistrationParams.margin.denominatorStr, 10),
      ],
      null
    ),
    Buffer.from(poolRegistrationParams.rewardAccountHex, 'hex'),
    poolRegistrationParams.poolOwners.map((ownerObj) => {
      return Buffer.from(ownerObj?.stakingKeyHashHex || '', 'hex')
    }),
    poolRegistrationParams.relays.map((relay) => {
      switch (relay.type) {
        case TxRelayType.SINGLE_HOST_IP:
          return [
            relay.type,
            relay.params.portNumber,
            relay.params.ipv4 ? ipv4AddressToBuf(relay.params.ipv4) : null,
            relay.params.ipv6 ? ipv6AddressToBuf(relay.params.ipv6) : null,
          ]
        case TxRelayType.SINGLE_HOST_NAME:
          return [relay.type, relay.params.portNumber, relay.params.dnsName]
        case TxRelayType.MULTI_HOST_NAME:
          return [relay.type, relay.params.dnsName]
        default:
          return []
      }
    }),
    poolRegistrationParams.metadata
      ? [
          poolRegistrationParams.metadata.metadataUrl,
          Buffer.from(poolRegistrationParams.metadata.metadataHashHex, 'hex'),
        ]
      : null,
  ]
}

export function cborizeTxCertificates(certificates: TxCertificate[]): CborizedTxCertificate[] {
  const txCertificates = certificates.map((certificate) => {
    switch (certificate.type) {
      case TxCertificateType.STAKING_KEY_REGISTRATION:
        return cborizeStakingKeyRegistrationCert(certificate)
      case TxCertificateType.STAKING_KEY_DEREGISTRATION:
        return cborizeStakingKeyDeregistrationCert(certificate)
      case TxCertificateType.DELEGATION:
        return cborizeDelegationCert(certificate)
      case TxCertificateType.STAKEPOOL_REGISTRATION:
        return cborizeStakepoolRegistrationCert(certificate)
      default:
        throw new UnexpectedError(UnexpectedErrorReason.InvalidCertificateType)
    }
  })
  return txCertificates
}

export function cborizeTxWithdrawals(withdrawals: TxWithdrawal[]): CborizedTxWithdrawals {
  const txWithdrawals: CborizedTxWithdrawals = new Map()
  withdrawals.forEach((withdrawal) => {
    const stakingAddress: Buffer = bech32.decode(withdrawal.stakingAddress).data
    txWithdrawals.set(stakingAddress, new CborInt64(withdrawal.rewards))
  })
  return txWithdrawals
}

export function cborizeTxWitnessesShelley(
  shelleyWitnesses: TxShelleyWitness[]
): CborizedTxWitnessShelley[] {
  const txWitnessesShelley: CborizedTxWitnessShelley[] = shelleyWitnesses.map(
    ({publicKey, signature}) => [publicKey, signature]
  )
  return txWitnessesShelley
}

function cborizeTxWitnessesByron(byronWitnesses: TxByronWitness[]): CborizedTxWitnessByron[] {
  const txWitnessesByron: CborizedTxWitnessByron[] = byronWitnesses.map(
    ({publicKey, signature, chainCode, addressAttributes}) => [
      publicKey,
      signature,
      chainCode,
      addressAttributes,
    ]
  )
  return txWitnessesByron
}

export function cborizeTxDatums(datums: TxDatum[]): CborizedTxDatum[] {
  const txDatums: CborizedTxDatum[] = datums.map((datum) => new CborizedTxDatum(datum))
  return txDatums
}

export function cborizeTxDatumOption(datumOption: TxDatumOption): CborizedDatumOption {
  if (datumOption.type === TxDatumOptionType.HASH) {
    return [0, Buffer.from(datumOption.hash, 'hex')]
  }
  return [1, new CborizedTxInlineDatum(datumOption.datum)]
}

export function cborizeTxRedeemers(
  redeemers: TxRedeemer[],
  inputs: TxInput[],
  mint: TokenBundle = []
): CborizedTxRedeemer[] {
  const orderedInputs = cborizeTxInputs(inputs) // also orders input in lexographical order
  const multiAssets = cborizeTxOutputTokenBundle(mint, true)
  const txRedeemers: CborizedTxRedeemer[] = redeemers.map((redeemer) => {
    const datum = new CborizedTxDatum(redeemer.data)
    const exUnits: [number, number] = [redeemer.exUnits.memory, redeemer.exUnits.steps]
    switch (redeemer.tag) {
      case TxRedeemerTag.SPEND: {
        const txIndex = orderedInputs.findIndex(
          (input) =>
            input[0].toString('hex') === redeemer.ref.txHash && input[1] === redeemer.ref.outputIndex
        )
        if (txIndex < 0) {
          throw new UnexpectedError(UnexpectedErrorReason.CborizeError, {
            message: 'Cannot find redeemer input',
          })
        }
        return [redeemer.tag, txIndex, datum, exUnits]
      }
      case TxRedeemerTag.MINT: {
        const assetIndex = Array.from(multiAssets.keys()).findIndex(
          (policy) => policy.toString('hex') === redeemer.ref.policyId
        )
        if (assetIndex < 0) {
          throw new UnexpectedError(UnexpectedErrorReason.CborizeError, {
            message: 'Cannot find assets matching minting policy',
          })
        }
        return [redeemer.tag, assetIndex, datum, exUnits]
      }
      default:
        throw new UnexpectedError(UnexpectedErrorReason.CborizeError, {message: 'Unsupported redeemer'})
    }
  })
  return txRedeemers
}

export function cborizeTxScripts(scripts: TxScriptSource[]): CborizedTxScript[] {
  const txScripts = compact(
    scripts.map((script) => (script.isReferenceScript ? undefined : script.bytes))
  )
  return txScripts
}

type WitnessParams = {
  byronWitnesses: TxByronWitness[]
  shelleyWitnesses: TxShelleyWitness[]
  scripts?: TxScriptSource[]
  datums?: TxDatum[]
  redeemers?: TxRedeemer[]
  mint?: TokenBundle // required for redeemers for matching refs
  inputs: TxInput[] // required for redeemers for matching refs
}

export function cborizeTxWitnesses({
  byronWitnesses,
  shelleyWitnesses,
  scripts,
  datums,
  redeemers,
  inputs,
  mint,
}: WitnessParams): CborizedTxWitnesses {
  const txWitnesses: CborizedTxWitnesses = new Map()
  if (byronWitnesses.length > 0) {
    txWitnesses.set(TxWitnessKey.BYRON, cborizeTxWitnessesByron(byronWitnesses))
  }
  if (shelleyWitnesses.length > 0) {
    txWitnesses.set(TxWitnessKey.SHELLEY, cborizeTxWitnessesShelley(shelleyWitnesses))
  }
  if (scripts && scripts.length > 0) {
    const [v1, v2] = partition(scripts, (script) => script.language === Language.PLUTUSV1)
    if (v1.length > 0) {
      txWitnesses.set(TxWitnessKey.SCRIPTS_V1, cborizeTxScripts(scripts))
    }
    if (v2.length > 0) {
      txWitnesses.set(TxWitnessKey.SCRIPTS_V2, cborizeTxScripts(scripts))
    }
  }
  if (datums && datums.length > 0) {
    txWitnesses.set(TxWitnessKey.DATA, cborizeTxDatums(datums))
  }
  if (redeemers && redeemers.length > 0) {
    txWitnesses.set(TxWitnessKey.REDEEMERS, cborizeTxRedeemers(redeemers, inputs, mint))
  }
  return txWitnesses
}

/**
 * @param value **containing ADA** and optionally other assets
 * @returns a value that encodes into coin / [coin,multiasset<uint>] (see CDDL)
 * @throws if argument doesn't contain ADA or has extra entries under ADA policy id key
 */
export const cborizeNormalizedTxValue = (value: api.Value): CborizedTxValue => {
  const adaAssetNameToCoins = value.get(AdaPolicyId)
  if (adaAssetNameToCoins && adaAssetNameToCoins.size > 1) {
    // sanity check
    throw Error(`Unexpected size ${adaAssetNameToCoins.size} of Map under ADA policy id key`)
  }
  const cborizedCoins = new CborInt64(adaAssetNameToCoins?.get(AdaAssetName) ?? 0)
  if (value.size <= 1) {
    return cborizedCoins
  } else {
    const multiAsset = new Map(
      [...value]
        .filter(([policyId]) => policyId !== AdaPolicyId)
        .map(([policyId, assets]) => [
          Buffer.from(policyId, 'hex'),
          new Map(
            [...assets].map(([assetName, amount]) => [
              Buffer.from(assetName, 'hex'),
              new CborInt64(amount),
            ])
          ),
        ])
    )
    return [cborizedCoins, multiAsset]
  }
}
