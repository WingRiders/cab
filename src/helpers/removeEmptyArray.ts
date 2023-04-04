export const removeEmptyArray = <T>(arr?: T[]): T[] | undefined =>
  arr && arr.length > 0 ? arr : undefined
