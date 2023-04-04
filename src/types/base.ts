import {BigNumber} from 'bignumber.js'

/**
 * Use BigNumber aliases
 */
export {BigNumber}
export const AssetQuantity = BigNumber
export type AssetQuantity = BigNumber // eslint-disable-line @typescript-eslint/no-redeclare

export type Address = string & {__typeAddress: any}

export type Asset = {
  policyId: HexString
  assetName: HexString
}

export type Token = Asset & {
  quantity: AssetQuantity
}

export type TokenBundle = Token[]

export const Ada = BigNumber
export type Ada = BigNumber & {__typeAda: any} // eslint-disable-line @typescript-eslint/no-redeclare

export const Lovelace = BigNumber
export type Lovelace = BigNumber & {__typeLovelace: any} // eslint-disable-line @typescript-eslint/no-redeclare
export const ZeroLovelace = new Lovelace(0) as Lovelace

/* Utility types */
export type HexString = string
export type Hash32String = string

export interface ILogger {
  error(...data: any[]): void
  info(...data: any[]): void
  log(...data: any[]): void
  warn(...data: any[]): void
  debug(...data: any[]): void
}
