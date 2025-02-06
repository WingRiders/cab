import assert from 'assert'

import {makeNonNullable} from '@/helpers'

describe('makeNonNullable', () => {
  type Type1 = {a: string | null}
  type OptionalAdditions = {b: string | null}
  const optionalAdditions: (keyof OptionalAdditions)[] = ['b']

  it('keeps the original object if no field is null', () => {
    assert.deepStrictEqual(
      makeNonNullable<Type1, OptionalAdditions>({a: 'a', b: 'b'}, optionalAdditions),
      {
        a: 'a',
        b: 'b',
      }
    )
  })

  it('keeps the original object if only fields in optional additions are null', () => {
    assert.deepStrictEqual(
      makeNonNullable<Type1, OptionalAdditions>({a: 'a', b: null}, optionalAdditions),
      {
        a: 'a',
        b: null,
      }
    )
  })

  it('throws if a required field is null', () => {
    assert.throws(() => makeNonNullable<Type1, OptionalAdditions>({a: null, b: null}, optionalAdditions))
  })
})
