export const optionalFields = <T extends object>(obj: T): Partial<T> =>
  Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {} as any)
