import {AssetQuantity} from '../../src/types'

export const tokens = {
  token1: {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '66697273746173736574',
    quantity: new AssetQuantity(8),
  },
  token2: {
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: '7365636f6e646173736574',
    quantity: new AssetQuantity(4),
  },
  token3: {
    policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    assetName: '',
    quantity: new AssetQuantity(2),
  },
  tokenMinimal: {
    policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
    assetName: '',
    quantity: new AssetQuantity(1),
  },
  smallToken: (character) => ({
    policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
    assetName: Buffer.from(character).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
  smallToken2: (character) => ({
    policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    assetName: Buffer.from(character).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
  smallToken3: (character) => ({
    policyId: 'ca37dd6b151b6a1d023ecbd22d7e881d814b0c58a3a3148b42b865a0',
    assetName: Buffer.from(character).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
  largeToken: (character) => ({
    policyId: 'abb1ab56c6f3c0804ad7e7928d73493df46e5abbc399e8e4312a1784',
    assetName: Buffer.from(`${character}0123456789ABCDEFGHIJ0123456789A`).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
  largeToken2: (character) => ({
    policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
    assetName: Buffer.from(`${character}0123456789ABCDEFGHIJ0123456789A`).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
  largeToken3: (character) => ({
    policyId: '80e30ac715e1c064f6599a7e5e3a33b6ea70b43b6a3addcb0859fbce',
    assetName: Buffer.from(`${character}0123456789ABCDEFGHIJ0123456789A`).toString('hex'),
    quantity: new AssetQuantity(1),
  }),
}
