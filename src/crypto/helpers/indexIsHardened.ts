import {HARDENED_THRESHOLD} from '@/ledger/address'

const indexIsHardened = (index) => index >= HARDENED_THRESHOLD

export default indexIsHardened
