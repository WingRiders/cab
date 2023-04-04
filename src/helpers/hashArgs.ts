import {getHash} from './getHash'

export type Hashable =
  // primitives
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  // arbitrary object with a toJSON() method
  | Readonly<{toJSON(key: string): unknown}>
  // structures
  | Readonly<{[key: string | number]: Hashable; [key: symbol]: never}>
  | ReadonlyArray<Hashable>
  | ReadonlyMap<Hashable, Hashable>
  | ReadonlySet<Hashable>

export const hashArgs = (args: Hashable[]) =>
  getHash(
    JSON.stringify(args, (_, value: unknown) =>
      typeof value === 'bigint'
        ? value.toString()
        : value instanceof Map
        ? [...value.entries()]
        : value instanceof Set
        ? [...value]
        : value
    )
  )
