export type NonNullableObject<T extends object> = {
  [K in keyof T]: NonNullable<T[K]>
}

export const makeNonNullable = <T extends object>(o: T): NonNullableObject<T> => {
  if (Object.values(o).some((value) => value === null)) {
    throw new Error('Given object contains a property with a value of null!')
  }

  return o as NonNullableObject<T>
}
