declare module 'borc' {
  export const encode: (any) => Buffer /* in reality it can also be null */
  export const decode: (Buffer) => any
  export class Tagged<T> {
    public tag: number
    public value: T
    constructor(tag: number, value: T, err: Error | null)
  }
  export class Decoder {
    constructor(opts: {tags: Record<number, (val: any) => any>})
    decodeFirst(buffer: Buffer): any
  }
}

declare module 'cardano-crypto.js' {
  export enum AddressTypes {
    BASE = 0b0000,
    BASE_SCRIPT_KEY = 0b0001,
    BASE_KEY_SCRIPT = 0b0010,
    BASE_SCRIPT_SCRIPT = 0b0011,
    POINTER = 0b0100,
    POINTER_SCRIPT = 0b0101,
    ENTERPRISE = 0b0110,
    ENTERPRISE_SCRIPT = 0b0111,
    BOOTSTRAP = 0b1000,
    REWARD = 0b1110,
    REWARD_SCRIPT = 0b1111,
  }

  export enum BaseAddressTypes {
    BASE = 0b00,
    SCRIPT_KEY = 0b01,
    KEY_SCRIPT = 0b10,
    SCRIPT_SCRIPT = 0b11,
  }

  export function addressToBuffer(address: string /* bech32/58 encoded address */): Buffer
  export function packBaseAddress(
    spendingHash: Buffer /* either a pubkey hash or script hash */,
    stakingKey: Buffer /* either a pubkey hash or script hash */,
    networkId: number,
    type: BaseAddressTypes = BaseAddressTypes.BASE
  ): Buffer
  export function packEnterpriseAddress(
    spendingHash: Buffer /* either a pubkey hash or a script hash */,
    networkId: number,
    isScript?: boolean
  ): Buffer
  export function packRewardAddress(stakingHash: Buffer, networkId: number, isScript?: boolean): Buffer
  export function getAddressType(address: Buffer): number
  export function hasSpendingScript(address: Buffer): boolean
  export function hasStakingScript(address: Buffer): boolean
  export function getPubKeyBlake2b224Hash(pubKey: Buffer): Buffer
  export function xpubToHdPassphrase(xpub: Buffer): Buffer
  export function hasSpendingScript(address: Buffer): boolean

  export function getShelleyAddressNetworkId(address: Buffer): number

  export function decodePaperWalletMnemonic(paperWalletMnemonic: string): Buffer
  export function mnemonicToRootKeypair(mnemonic: string, derivationScheme: number): Promise<Buffer>
  export function derivePublic(parentExtPubKey: Buffer, index: number, derivationScheme: number): Buffer
  export function derivePrivate(parentKey: Buffer, index: number, derivationScheme: number): Buffer

  export function blake2b(input: Buffer, outputLen: number): Buffer
  export function scrypt(password: Buffer, salt: Buffer, options: any, callback: (string) => any): void

  export function cardanoMemoryCombine(input: Buffer, password: string): Buffer

  export function sign(msg: Buffer, walletSecret: Buffer): Buffer

  type bech32 = {
    encode(prefix: string, data: Buffer): string
    decode(address: string): {prefix: string; data: Buffer}
  }
  export const bech32: bech32
  type base58 = {
    encode(data: Buffer): string
    decode(address: string): Buffer
  }
  export const base58: base58
}
