import {encode} from 'borc'

export const encodeCbor = (cborHex: string) => encode(Buffer.from(cborHex, 'hex')).toString('hex')
