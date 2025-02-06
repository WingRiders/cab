import {HARDENED_THRESHOLD} from '@/ledger/address/addressConstants'

export const toBip32StringPath = (derivationPath: number[]) =>
  `m/${derivationPath
    .map((item) => (item % HARDENED_THRESHOLD) + (item >= HARDENED_THRESHOLD ? "'" : ''))
    .join('/')}`
