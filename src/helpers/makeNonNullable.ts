export type NonNullableObject<T extends object> = {
  [K in keyof T]: NonNullable<T[K]>
}

export const makeNonNullable = <T extends object, OptionalAdditions extends object>(
  o: T & OptionalAdditions,
  optionalKeys: string[]
): NonNullableObject<T> & OptionalAdditions => {
  // Conway fields should not be included in requiredKeys before the hard-fork
  const requiredKeys = Object.keys(o).filter((key) => !optionalKeys.includes(key))
  for (const key of requiredKeys) {
    if (o[key] === null) {
      throw new Error(`Property ${key} is null!`)
    }
  }
  return o as NonNullableObject<T> & OptionalAdditions
}
