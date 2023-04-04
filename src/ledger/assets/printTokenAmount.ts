import BigNumber from 'bignumber.js'

export const printTokenAmount = (quantity: BigNumber, decimals: number): string =>
  quantity.shiftedBy(-decimals).toFixed(decimals)
