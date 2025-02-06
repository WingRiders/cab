import assert from 'assert'
import {encode} from 'borc'
import {cloneDeep} from 'lodash/fp'

import {UnexpectedErrorReason} from '@/errors'
import {adaToLovelace} from '@/helpers'
import {cborizeTxDatums, cborizeTxRedeemers, estimateTxSize} from '@/ledger/transaction'
import {encodeMetadata} from '@/ledger/transaction/metadata/encodeMetadata'
import {selectMinimalTxPlan} from '@/ledger/transaction/transactionPlanner'
import {METADATA_HASH_BYTE_LENGTH} from '@/ledger/transaction/txConstants'
import {Address, AssetQuantity, Lovelace, TxPlanArgs, TxRedeemerTag, UTxO, ZeroLovelace} from '@/types'
import {TxPlanDraft, TxPlanMetadata} from '@/types/txPlan'

import {protocolParameters} from './data/protocolParameters'
import {tokens} from './data/tokens'

const utxos: {utxo1: UTxO; utxo2: UTxO; utxoWithTokens1: UTxO} = {
  utxo1: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(1)) as Lovelace,
    outputIndex: 1,
    tokenBundle: [],
  },
  utxo2: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(2)) as Lovelace,
    outputIndex: 0,
    tokenBundle: [],
  },
  utxoWithTokens1: {
    txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    address:
      'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
    coins: new Lovelace(adaToLovelace(3)) as Lovelace,
    outputIndex: 0,
    tokenBundle: [tokens.token1, tokens.token2, tokens.token3],
  },
}

const sendAdaAmountArgs = (lovelace): TxPlanArgs => ({
  planId: 'sendAda',
  outputs: [
    {
      address:
        'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
      coins: new Lovelace(lovelace) as Lovelace,
      tokenBundle: [],
    },
  ],
  protocolParameters,
})

const sendTokenAmountArgs = (token, quantity): TxPlanArgs => ({
  planId: 'sendToken',
  outputs: [
    {
      address:
        'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
      coins: ZeroLovelace,
      tokenBundle: [
        {
          policyId: token.policyId,
          assetName: token.assetName,
          quantity,
        },
      ],
    },
  ],
  protocolParameters,
})

const changeAddress =
  'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address

const successPlanFixtures = {
  'not add change to fee': {
    args: sendAdaAmountArgs(adaToLovelace(1.5)),
    changeAddress,
    utxos: [utxos.utxo2, utxos.utxo1],
    fee: new Lovelace(173_025),
  },
  'not create big enough change so should add change to fee': {
    args: sendAdaAmountArgs(adaToLovelace(1.5)),
    changeAddress,
    utxos: [utxos.utxo2],
    fee: new Lovelace(adaToLovelace(0.5)),
  },
  'fit perfectly': {
    args: sendAdaAmountArgs(1_831_595),
    changeAddress,
    utxos: [utxos.utxo2],
    fee: new Lovelace(168_405),
  },
  'not add change into tx so should increase fee': {
    args: sendAdaAmountArgs(1_831_594),
    changeAddress,
    utxos: [utxos.utxo2],
    fee: new Lovelace(168_406),
  },
}

describe('Successful transaction plans', () => {
  Object.entries(successPlanFixtures).forEach(([name, setting]) =>
    it(`should ${name}`, () => {
      const {utxos, changeAddress, fee, args} = setting

      // @ts-ignore
      const txPlanResult = selectMinimalTxPlan(utxos, [], changeAddress as Address, args)
      if (txPlanResult?.success === true) {
        assert.deepEqual(txPlanResult.txPlan.fee, fee)
      } else {
        assert(false, 'Transaction plan is not succesful')
      }
    })
  )
})

const failurePlanFixtures = {
  'fail with empty inputs': {
    args: sendAdaAmountArgs(new Lovelace(adaToLovelace(1.5))),
    changeAddress,
    utxos: [],
    error: UnexpectedErrorReason.CannotConstructTxPlan,
  },
  'fail with not enough ada': {
    args: sendAdaAmountArgs(new Lovelace(adaToLovelace(5))),
    changeAddress,
    utxos: [utxos.utxo1, utxos.utxo2],
    error: UnexpectedErrorReason.CannotConstructTxPlan,
  },
  'fail with not enough tokens': {
    args: sendTokenAmountArgs(tokens.token2, new AssetQuantity(8)),
    changeAddress,
    utxos: [utxos.utxoWithTokens1],
    error: UnexpectedErrorReason.CannotConstructTxPlan,
  },
  'fail with not enough ada to pay for min change lovelace': {
    args: sendAdaAmountArgs(adaToLovelace(2.5)),
    changeAddress,
    utxos: [utxos.utxoWithTokens1],
    error: UnexpectedErrorReason.CannotConstructTxPlan,
  },
}

describe('Unsuccessful transaction plans', () => {
  Object.entries(failurePlanFixtures).forEach(([name, setting]) =>
    it(`should ${name}`, () => {
      const {utxos, changeAddress, error, args} = setting
      // @ts-ignore
      const txPlanResult = selectMinimalTxPlan(utxos, [], changeAddress as Address, args)
      if (txPlanResult?.success === false) {
        assert.equal(txPlanResult.error.code, error)
      } else if (txPlanResult?.success === true) {
        assert(false, 'Transaction plan is succesful and it should not be')
      } else {
        assert(false, 'Transaction plan is undefined and it should not be')
      }
    })
  )
})

describe('Size estimation', () => {
  const baseTransactionPlan: Required<
    Omit<
      TxPlanDraft,
      'protocolParameters' | 'planId' | 'requiredSigners' | 'metadata' | 'collateralOutput'
    >
  > = {
    inputs: [],
    referenceInputs: [],
    outputs: [],
    certificates: [],
    withdrawals: [],
    collateralInputs: [],
    datums: [],
    redeemers: [],
    scripts: [],
    mint: [],
    // metadata: {},
  }

  const getBasePlan = (): [typeof baseTransactionPlan, number] => {
    const {utxos, changeAddress, args} = successPlanFixtures['fit perfectly']
    const txPlanResult = selectMinimalTxPlan(
      utxos as UTxO[],
      [],
      changeAddress as Address,
      args as TxPlanArgs
    )
    if (txPlanResult === null) {
      assert.fail('No transaction plan')
    }
    if (txPlanResult.success === false) {
      assert.fail(txPlanResult.error)
    }

    const plan = {
      ...cloneDeep(baseTransactionPlan),
      ...txPlanResult.txPlan,
    }

    return [plan, estimateTxSize(plan)]
  }

  it('datum should increase the estimated size', () => {
    const [plan, baseSize] = getBasePlan()
    // add datum
    plan.datums = [new Map([['key', 1]])]
    const newSize = estimateTxSize(plan)
    const datumSize = encode(cborizeTxDatums(plan.datums)).length + 1 // the key
    const integritySize = 32 + 2 + 1 // hash length + header + key
    assert(baseSize < newSize, 'datum increased the size')
    assert(baseSize + datumSize < newSize, 'script integrity ignored')
    assert.strictEqual(newSize, baseSize + datumSize + integritySize)
  })

  it('redeemer should increase the estimated size', () => {
    const [plan, baseSize] = getBasePlan()
    // add redeemer
    plan.redeemers = [
      {
        tag: TxRedeemerTag.SPEND,
        ref: {txHash: plan.inputs[0].txHash, outputIndex: plan.inputs[0].outputIndex},
        data: 'hi',
        exUnits: {memory: 400, cpu: 400},
      },
    ]
    const newSize = estimateTxSize(plan)
    const redeemerSize = encode(cborizeTxRedeemers(plan.redeemers, plan.inputs)).length + 1 // the key
    const integritySize = 32 + 2 + 1 // hash length + header + key
    assert(baseSize < newSize, 'redeemer increased the size')
    assert(baseSize + redeemerSize < newSize, 'script integrity ignored')
    assert.strictEqual(newSize, baseSize + redeemerSize + integritySize)
  })
  it('metadata should increase the estimated size', () => {
    const [plan, baseSize] = getBasePlan()
    const metadata: TxPlanMetadata = {
      message: ['Test message'],
    }
    const newSize = estimateTxSize({...plan, metadata})
    const metadataSize = encode(encodeMetadata(metadata)).length
    const hashSize = METADATA_HASH_BYTE_LENGTH + 2 /* cbor header */ + 1 /* key */
    assert(baseSize < newSize, 'metadata increased the size')
    assert.strictEqual(newSize, baseSize + metadataSize + hashSize)
  })
})
