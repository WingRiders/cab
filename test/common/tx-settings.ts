import {adaToLovelace} from '@/helpers'
import {
  Address,
  AssetQuantity,
  Language,
  Lovelace,
  TxCertificateType,
  TxDatum,
  TxOutputType,
  TxPlanArgs,
  TxRedeemerTag,
  ZeroLovelace,
} from '@/types'

import {protocolParameters} from '../data/protocolParameters'

const ttl = 8493834

const inputTokens = [
  {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '66697273746173736574',
    quantity: new AssetQuantity(8),
  },
  {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '7365636f6e646173736574',
    quantity: new AssetQuantity(4),
  },
  {
    policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    assetName: '',
    quantity: new AssetQuantity(2),
  },
]

const transactionSettings: {
  [key: string]: {
    [key: string]: any
    args: TxPlanArgs
  }
} = {
  sendAda: {
    args: {
      planId: 'sendAda',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(5.5)) as Lovelace,
          tokenBundle: [],
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp' as Address,
            coins: new Lovelace(adaToLovelace(5.2)),
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
            coins: new Lovelace(adaToLovelace(10)),
            outputIndex: 1,
            tokenBundle: inputTokens,
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
            coins: new Lovelace(adaToLovelace(5.5)),
            tokenBundle: [],
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
            coins: new Lovelace(8151859),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
            coins: new Lovelace(1361960),
            tokenBundle: inputTokens,
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(0),
        fee: new Lovelace(186181),
        baseFee: new Lovelace(186181),
        withdrawals: [],
        datums: [],
        scripts: [],
        redeemers: [],
        planId: 'sendAda',
      },
    },
    ttl,
    txHash: '54ada12a4d169afdee03b4bd84c2c389357a9232a31ec07aa4c143f8e74ba7ae',
  },
  sendToken: {
    args: {
      planId: 'sendToken',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: ZeroLovelace,
          tokenBundle: [
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '7365636f6e646173736574',
              quantity: new AssetQuantity(2),
            },
          ],
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(adaToLovelace(10)),
            outputIndex: 1,
            tokenBundle: inputTokens,
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0',
            coins: new Lovelace(1202490),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(2),
              },
            ],
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(7255045),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(1361960),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(8),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(2),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new AssetQuantity(2),
              },
            ],
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(1202490),
        fee: new Lovelace(180505),
        baseFee: new Lovelace(180505),
        withdrawals: [],
        datums: [],
        scripts: [],
        redeemers: [],
        planId: 'sendToken',
      },
    },
    ttl,
    txHash: '094ef67f18588d768ed190d9f02a0b79eb5819c220fe3539ea5e42924c3c8acd',
  },
  sendToScript: {
    args: {
      planId: 'sendToScript',
      outputs: [
        {
          address: 'addr_test1wzkryw6fatk9mz9tr80cugh0tr7mpyp3r3d8pvmc397kuzq2ceepe' as Address,
          coins: new Lovelace(adaToLovelace(6)) as Lovelace,
          tokenBundle: [
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '7365636f6e646173736574',
              quantity: new AssetQuantity(2),
            },
          ],
          datum: {key: 'value'} as unknown as TxDatum,
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(adaToLovelace(10)),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(8),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(4),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new AssetQuantity(2),
              },
            ],
            outputIndex: 1,
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address: 'addr_test1wzkryw6fatk9mz9tr80cugh0tr7mpyp3r3d8pvmc397kuzq2ceepe',
            coins: new Lovelace(adaToLovelace(6)),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(2),
              },
            ],
            datumHash: '8fee320201d867c9408b4dc57e575f6a61241a5ec89cdc249979fd8b3a98f07c',
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(2455511),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(1361960),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(8),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(2),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new AssetQuantity(2),
              },
            ],
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        withdrawals: [],
        additionalLovelaceAmount: new Lovelace(adaToLovelace(6)),
        datums: [
          {
            key: 'value',
          },
        ],
        fee: new Lovelace(182529),
        baseFee: new Lovelace(182529),
        scripts: [],
        redeemers: [],
        planId: 'sendToScript',
      },
    },
    ttl,
    txHash: '7a282b789fdf5b2597313fa0c6053457a9d72ecffa1179309bf5ba11b3337017',
  },
  registerAndDelegation: {
    args: {
      planId: 'registerAndDelegation',
      certificates: [
        {
          type: TxCertificateType.STAKE_REGISTRATION,
          stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks' as Address,
        },
        {
          type: TxCertificateType.STAKE_DELEGATION,
          poolHash: '04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438',
          stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks' as Address,
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp',
            coins: new Lovelace(adaToLovelace(5.2)),
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(3015403),
            tokenBundle: [],
          },
        ],
        certificates: [
          {
            type: 0,
            stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks',
          },
          {
            type: 2,
            stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks',
            poolHash: '04c60c78417132a195cbb74975346462410f72612952a7c4ade7e438',
          },
        ],
        deposit: new Lovelace(adaToLovelace(2)),
        additionalLovelaceAmount: new Lovelace(0),
        fee: new Lovelace(184597),
        baseFee: new Lovelace(184597),
        withdrawals: [],
        datums: [],
        scripts: [],
        redeemers: [],
        planId: 'registerAndDelegation',
      },
    },
    ttl,
    txHash: 'c0d70d8497d35ba4ebc3e6fe35b7dcc3153037c706ac38aa66cb5445ef61bc96',
  },
  rewardWithdrawal: {
    args: {
      planId: 'rewardWithdrawal',
      withdrawals: [
        {
          stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks' as Address,
          rewards: new Lovelace(adaToLovelace(5)) as Lovelace,
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp',
            coins: new Lovelace(adaToLovelace(5.2)),
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(10024247),
            tokenBundle: [],
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(0),
        fee: new Lovelace(175753),
        baseFee: new Lovelace(175753),
        withdrawals: [
          {
            stakingAddress: 'stake1uy9ggsc9qls4pu9qvyyacwnmr9tt0gzcdt5s0zj4au8qkqc65geks',
            rewards: new Lovelace(adaToLovelace(5)),
          },
        ],
        datums: [],
        scripts: [],
        redeemers: [],
        planId: 'rewardWithdrawal',
      },
    },
    ttl,
    txHash: 'a14683b66590a89b8baf0a07e6998242325dd6427383cbf4a75a4dc8bb4cbca5',
  },
  mint: {
    args: {
      planId: 'mint',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(1.4)) as Lovelace,
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
          ],
        },
      ],
      mint: [
        {
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
          ],
          script: {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
          redeemer: {
            tag: TxRedeemerTag.MINT,
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
          },
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp',
            coins: new Lovelace(adaToLovelace(5.2)),
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        referenceInputs: [],
        collateralInputs: [
          {
            address:
              'addr1q84vflkn60my500vm8qmka0lgaezl43mlrweh29gdw2temg2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsquk02w',
            coins: new Lovelace(3000121),
            outputIndex: 2,
            tokenBundle: [],
            txHash: 'caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0',
            coins: new Lovelace(adaToLovelace(1.4)),
            tokenBundle: [
              {
                policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
                assetName: '46524545',
                quantity: new AssetQuantity(500),
              },
            ],
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(3613818),
            tokenBundle: [],
          },
        ],
        datums: [],
        redeemers: [
          {
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
            ref: {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            },
            tag: 1,
          },
        ],
        mint: [
          {
            policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            assetName: '46524545',
            quantity: new AssetQuantity(500),
          },
        ],
        scripts: [
          {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(adaToLovelace(1.4)),
        fee: new Lovelace(186182),
        baseFee: new Lovelace(186182),
        withdrawals: [],
        planId: 'mint',
      },
    },
    ttl,
    txHash: '60263daff7a4f25f4c6696e304d8cfeb76bb02e8ef85f1249d735eadd5870087',
    cborHex:
      'a70081825820adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca03018282584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a00155cc0a1581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f482583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a0037247a021a0002d746031a00819b0a09a1581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f40b582057dfa6bcb9a9a456566450e5cd430283ab71eb9649d4b1a41e54a360c0b977b70d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02',
  },
  mintSendTokens: {
    args: {
      planId: 'mintSendTokens',
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(1.8)) as Lovelace,
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '66697273746173736574',
              quantity: new AssetQuantity(4),
            },
          ],
        },
      ],
      mint: [
        {
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
          ],
          script: {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
          redeemer: {
            tag: TxRedeemerTag.MINT,
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
          },
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(adaToLovelace(10)),
            outputIndex: 1,
            tokenBundle: inputTokens,
          },
        ],
        referenceInputs: [],
        collateralInputs: [
          {
            address:
              'addr1q84vflkn60my500vm8qmka0lgaezl43mlrweh29gdw2temg2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsquk02w',
            coins: new Lovelace(3000121),
            outputIndex: 2,
            tokenBundle: [],
            txHash: 'caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0',
            coins: new Lovelace(adaToLovelace(1.8)),
            tokenBundle: [
              {
                policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
                assetName: '46524545',
                quantity: new AssetQuantity(500),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(4),
              },
            ],
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(6642926),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(1361960),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(4),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(4),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new AssetQuantity(2),
              },
            ],
          },
        ],
        datums: [],
        redeemers: [
          {
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
            ref: {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            },
            tag: 1,
          },
        ],
        mint: [
          {
            policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            assetName: '46524545',
            quantity: new AssetQuantity(500),
          },
        ],
        scripts: [
          {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(adaToLovelace(1.8)),
        fee: new Lovelace(195114),
        baseFee: new Lovelace(195114),
        withdrawals: [],
        planId: 'mintSendTokens',
      },
    },
    ttl,
    txHash: 'af284b5da98d7eb5ac02d095186c4212cb64eaef70b49f3f435b84c35cbe60f3',
    cborHex:
      'a70081825820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef01018382584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a001b7740a2581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f4581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a14a666972737461737365740482583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a00655cee82583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b03821a0014c828a2581c6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7a14002581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a24a66697273746173736574044b7365636f6e64617373657404021a0002fa2a031a00819b0a09a1581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f40b582057dfa6bcb9a9a456566450e5cd430283ab71eb9649d4b1a41e54a360c0b977b70d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02',
  },
  mintSendTokensWithInput: {
    args: {
      planId: 'mintSendTokensWithInput',
      inputs: [
        {
          isScript: false,
          utxo: {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp' as Address,
            coins: new Lovelace(adaToLovelace(3)) as Lovelace,
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        },
      ],
      referenceInputs: [],
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(1.8)) as Lovelace,
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '66697273746173736574',
              quantity: new AssetQuantity(4),
            },
          ],
        },
      ],
      mint: [
        {
          tokenBundle: [
            {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
              assetName: '46524545',
              quantity: new AssetQuantity(500),
            },
          ],
          script: {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
          redeemer: {
            tag: TxRedeemerTag.MINT,
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
          },
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        inputs: [
          {
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp',
            coins: new Lovelace(adaToLovelace(3)),
            outputIndex: 3,
            tokenBundle: [],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(adaToLovelace(10)),
            outputIndex: 1,
            tokenBundle: inputTokens,
          },
        ],
        referenceInputs: [],
        collateralInputs: [
          {
            address:
              'addr1q84vflkn60my500vm8qmka0lgaezl43mlrweh29gdw2temg2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsquk02w',
            coins: new Lovelace(3000121),
            outputIndex: 2,
            tokenBundle: [],
            txHash: 'caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0',
            coins: new Lovelace(adaToLovelace(1.8)),
            tokenBundle: [
              {
                policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
                assetName: '46524545',
                quantity: new AssetQuantity(500),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(4),
              },
            ],
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(9635226),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(1361960),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(4),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new AssetQuantity(4),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new AssetQuantity(2),
              },
            ],
          },
        ],
        datums: [],
        redeemers: [
          {
            data: 'FREE',
            exUnits: {
              memory: 1700,
              cpu: 476468,
            },
            ref: {
              policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            },
            tag: 1,
          },
        ],
        mint: [
          {
            policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
            assetName: '46524545',
            quantity: new AssetQuantity(500),
          },
        ],
        scripts: [
          {
            bytes: Buffer.from('4F010000332232001220041200120011', 'hex'),
            language: Language.PLUTUSV1,
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        additionalLovelaceAmount: new Lovelace(adaToLovelace(1.8)),
        fee: new Lovelace(202814),
        baseFee: new Lovelace(202814),
        withdrawals: [],
        planId: 'mintSendTokensWithInput',
      },
    },
    ttl,
    txHash: '2a769a26780737c0cc79340f4f3bcd0c7bdff68ca4e1c2305d5cb30002167471',
    cborHex:
      'a70082825820adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca03825820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef01018382584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a001b7740a2581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f4581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a14a666972737461737365740482583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a0093059a82583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b03821a0014c828a2581c6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7a14002581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a24a66697273746173736574044b7365636f6e64617373657404021a0003183e031a00819b0a09a1581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f40b582057dfa6bcb9a9a456566450e5cd430283ab71eb9649d4b1a41e54a360c0b977b70d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02',
    signedTxBody:
      '84a70082825820adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca03825820deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef01018382584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a001b7740a2581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f4581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a14a666972737461737365740482583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a0093059a82583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b03821a0014c828a2581c6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7a14002581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a24a66697273746173736574044b7365636f6e64617373657404021a0003183e031a00819b0a09a1581cabb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784a144465245451901f40b582057dfa6bcb9a9a456566450e5cd430283ab71eb9649d4b1a41e54a360c0b977b70d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02a300838258205a100e17901f1847d51d35987ac744126433e8e561e42de8ce8670921f526898584033582aeb07276aa0cb2694c02999aea9a146b1b2574a2802535a5b72bcbdbf5514f3f99537fed255544defe9506fc2543952add3a84ef90a595e7e6f9a627c078258209c253c89bbe32d0b11c2abfa464e75627af25beb90c15adbd9f6b62160dfa8385840201bd59898b88ee65cec2580d320fb548113119c5fd010adba479b5566b0788e0c2369d7926def9338d164b1f85adc8477737934f203f659a560346fb6bb4f0582582079669d625d1c0ccfe69ec84698f1343d090edf090aedcd6c8fd49f83a2c235585840128fd47858692827576405c6407da2ccb89f721c29949181870d2412ce0878c2713308b38f716736acf1ff2e509d8fef9729439e07c5433e672cda589a1a180c0381504f01000033223200122004120012001105818401004446524545821906a41a00074534f5f6',
  },
  reclaimLockedAssets: {
    args: {
      planId: 'reclaimLockedAssets',
      inputs: [
        {
          isScript: true,
          isReferenceScript: false,
          utxo: {
            address: 'addr1wzkryw6fatk9mz9tr80cugh0tr7mpyp3r3d8pvmc397kuzq3za5wm' as Address,
            coins: new Lovelace(adaToLovelace(3)) as Lovelace,
            outputIndex: 2,
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new AssetQuantity(3),
              },
            ],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
            datum: 'exampleDatum',
          },
          redeemer: {
            tag: TxRedeemerTag.SPEND,
            data: 'exampleDatum',
            exUnits: {
              memory: 6502,
              cpu: 2105573,
            },
          },
          script: {
            bytes: Buffer.from(
              '584f584d010000333222323322323200122253353008330070030021006135004353005335738921094e6f7420457175616c0000649849848004800488ccd5cd19baf00200100500412200212200120011',
              'hex'
            ),
            language: Language.PLUTUSV1,
          },
        },
      ],
      outputs: [
        {
          address:
            'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0' as Address,
          coins: new Lovelace(adaToLovelace(1.5)) as Lovelace, // leave the change somewhere else
          tokenBundle: [
            {
              policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
              assetName: '66697273746173736574',
              quantity: new AssetQuantity(3),
            },
          ],
        },
      ],
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        additionalLovelaceAmount: new Lovelace(adaToLovelace(1.5)),
        baseFee: new Lovelace(182748),
        certificates: [],
        change: [
          {
            type: TxOutputType.LEGACY,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            coins: new Lovelace(1317252),
            isChange: true,
            tokenBundle: [],
          },
        ],
        referenceInputs: [],
        collateralInputs: [
          {
            address:
              'addr1q84vflkn60my500vm8qmka0lgaezl43mlrweh29gdw2temg2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsquk02w',
            coins: new Lovelace(3000121),
            outputIndex: 2,
            tokenBundle: [],
            txHash: 'caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        datums: ['exampleDatum'],
        deposit: new Lovelace(0),
        fee: new Lovelace(182748),
        inputs: [
          {
            address: 'addr1wzkryw6fatk9mz9tr80cugh0tr7mpyp3r3d8pvmc397kuzq3za5wm',
            coins: new Lovelace(adaToLovelace(3)),
            datum: 'exampleDatum',
            outputIndex: 2,
            tokenBundle: [
              {
                assetName: '66697273746173736574',
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                quantity: new AssetQuantity(3),
              },
            ],
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
          },
        ],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            address:
              'addr1qjag9rgwe04haycr283datdrjv3mlttalc2waz34xcct0g4uvf6gdg3dpwrsne4uqng3y47ugp2pp5dvuq0jqlperwj83r4pwxvwuxsgds90s0',
            coins: new Lovelace(adaToLovelace(1.5)),
            isChange: false,
            tokenBundle: [
              {
                assetName: '66697273746173736574',
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                quantity: new AssetQuantity(3),
              },
            ],
          },
        ],
        redeemers: [
          {
            data: 'exampleDatum',
            exUnits: {
              memory: 6502,
              cpu: 2105573,
            },
            ref: {
              txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
              outputIndex: 2,
            },
            tag: 0,
          },
        ],
        scripts: [
          {
            bytes: Buffer.from(
              '584f584d010000333222323322323200122253353008330070030021006135004353005335738921094e6f7420457175616c0000649849848004800488ccd5cd19baf00200100500412200212200120011',
              'hex'
            ),
            language: Language.PLUTUSV1,
          },
        ],
        withdrawals: [],
        planId: 'reclaimLockedAssets',
      },
    },
    ttl,
    txHash: '32032fcaf76040ae28bf57a178ba262aadd7baff814820c732a48709fa36f393',
    cborHex:
      'a60081825820adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02018282584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a0016e360a1581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a14a666972737461737365740382583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a00141984021a0002c9dc031a00819b0a0b5820612fa5944df17a93857b6abffb31d4f2f0624163792a7289a0d63cab6d46a7910d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02',
    signedTxBody:
      '84a60081825820adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02018282584104ba828d0ecbeb7e930351e2deada39323bfad7dfe14ee8a353630b7a2bc627486a22d0b8709e6bc04d11257dc405410d1ace01f207c391ba4788ea17198ee1a08821a0016e360a1581cca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0a14a666972737461737365740382583901f3db2225703e4cfbe2227772bdf057f9829449f18ac81e250ceb01ca0a84430507e150f0a06109dc3a7b1956b7a0586ae9078a55ef0e0b031a00141984021a0002c9dc031a00819b0a0b5820612fa5944df17a93857b6abffb31d4f2f0624163792a7289a0d63cab6d46a7910d81825820caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca02a4008182582079669d625d1c0ccfe69ec84698f1343d090edf090aedcd6c8fd49f83a2c2355858405b6516fa1ce342a971e7fcb9a5e470bead237644e8340a6fff3cfe64030244b2af1cf5372eba475973acd1cb60402c252eeedfca5481b78c7282d3652aff060903815851584f584d010000333222323322323200122253353008330070030021006135004353005335738921094e6f7420457175616c0000649849848004800488ccd5cd19baf0020010050041220021220012001104814c6578616d706c65446174756d05818400004c6578616d706c65446174756d821919661a002020e5f5f6',
  },
  swapWithMetadata: {
    args: {
      planId: 'create-swap-request',
      outputs: [
        {
          address: 'addr_test1wqypkgljkwh68x582zeg9pywm8ptetm2vvr8c5t77pyyyzcu66e8l' as Address,
          coins: new Lovelace(adaToLovelace(14)) as Lovelace,
          tokenBundle: [],
          datum: [],
        },
      ],
      metadata: {
        message: [
          "Test message, but so long we'll need to split it into multiple c",
          'hunks. Given this is the only standard we are given for messages',
          ', we might as well test for it',
        ],
      },
      protocolParameters,
    },
    txPlanResult: {
      success: true,
      txPlan: {
        planId: 'create-swap-request',
        additionalLovelaceAmount: new Lovelace(0),
        inputs: [
          {
            txHash: 'adadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
            address:
              'addr1q83gj5ydpqq9sxx8kg6jxktwlu0vrwfmg5azqfzm5d984zs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvps97k8sp',
            outputIndex: 3,
            coins: new Lovelace(adaToLovelace(5.2)),
            tokenBundle: [],
          },
          {
            txHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3',
            outputIndex: 1,
            coins: new Lovelace(adaToLovelace(10)),
            tokenBundle: [
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '66697273746173736574',
                quantity: new Lovelace(8),
              },
              {
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                assetName: '7365636f6e646173736574',
                quantity: new Lovelace(4),
              },
              {
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                assetName: '',
                quantity: new Lovelace(2),
              },
            ],
          },
          {
            txHash: 'caadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeca',
            address:
              'addr1q84vflkn60my500vm8qmka0lgaezl43mlrweh29gdw2temg2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsquk02w',
            outputIndex: 2,
            coins: new Lovelace(3000121),
            tokenBundle: [],
          },
        ],
        referenceInputs: [],
        collateralInputs: [],
        outputs: [
          {
            type: TxOutputType.LEGACY,
            isChange: false,
            address: 'addr_test1wqypkgljkwh68x582zeg9pywm8ptetm2vvr8c5t77pyyyzcu66e8l',
            coins: new Lovelace(adaToLovelace(14)),
            tokenBundle: [],
            datumHash: '45b0cfc220ceec5b7c1c62c4d4193d38e4eba48e8815729ce75f9c0ab0e4c1c0',
          },
        ],
        change: [
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
            coins: new Lovelace(2633500),
            tokenBundle: [],
          },
          {
            type: TxOutputType.LEGACY,
            isChange: true,
            address:
              'addr1q8eakg39wqlye7lzyfmh900s2luc99zf7x9vs839pn4srjs2s3ps2plp2rc2qcgfmsa8kx2kk7s9s6hfq799tmcwpvpsjv0zk3' as Address,
            coins: new Lovelace(1361960),
            tokenBundle: [
              {
                assetName: '66697273746173736574',
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                quantity: new Lovelace(8),
              },
              {
                assetName: '7365636f6e646173736574',
                policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
                quantity: new Lovelace(4),
              },
              {
                assetName: '',
                policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                quantity: new Lovelace(2),
              },
            ],
          },
        ],
        certificates: [],
        deposit: new Lovelace(0),
        baseFee: new Lovelace(204661),
        fee: new Lovelace(204661),
        datums: [[]],
        scripts: [],
        redeemers: [],
        withdrawals: [],
        metadata: {
          message: [
            "Test message, but so long we'll need to split it into multiple c",
            'hunks. Given this is the only standard we are given for messages',
            ', we might as well test for it',
          ],
        },
      },
    },
    txHash: 'ed3b02ead7f991a6bd930bead1adafe816bcdfd6244076e1627c5f59435b9885',
  },
}

export {transactionSettings}
