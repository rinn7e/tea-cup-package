/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
// `NullableEq` and `UndefinableEq`: `null` (`undefined`) is the missing
// value, and only it. Before, they compared by truthiness, so `null` and `''`
// were equal: a view memoized by such a field kept its old render when it
// went from `null` to `''`.
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import { NullableEq, UndefinableEq } from '../src'

describe('NullableEq', () => {
  it('tells null from an empty or zero value', () => {
    expect(NullableEq(S.Eq).equals(null, '')).toBe(false)
    expect(NullableEq(S.Eq).equals('', null)).toBe(false)
    expect(NullableEq(N.Eq).equals(null, 0)).toBe(false)
  })

  it('compares values with the given Eq, empty ones too', () => {
    expect(NullableEq(S.Eq).equals('', '')).toBe(true)
    expect(NullableEq(S.Eq).equals('a', 'a')).toBe(true)
    expect(NullableEq(S.Eq).equals('a', '')).toBe(false)
    expect(NullableEq(N.Eq).equals(0, 0)).toBe(true)
  })

  it('takes two missing values as equal, and missing as unequal to a value', () => {
    expect(NullableEq(S.Eq).equals(null, null)).toBe(true)
    expect(NullableEq(S.Eq).equals(null, 'a')).toBe(false)
    expect(NullableEq(S.Eq).equals('a', null)).toBe(false)
  })
})

describe('UndefinableEq', () => {
  it('tells undefined from an empty, zero or false value', () => {
    expect(UndefinableEq(S.Eq).equals(undefined, '')).toBe(false)
    expect(UndefinableEq(N.Eq).equals(0, undefined)).toBe(false)
    expect(UndefinableEq(B.Eq).equals(undefined, false)).toBe(false)
  })

  it('compares values with the given Eq, empty ones too', () => {
    expect(UndefinableEq(S.Eq).equals('', '')).toBe(true)
    expect(UndefinableEq(B.Eq).equals(true, false)).toBe(false)
    expect(UndefinableEq(B.Eq).equals(false, false)).toBe(true)
  })

  it('takes two missing values as equal, and missing as unequal to a value', () => {
    expect(UndefinableEq(S.Eq).equals(undefined, undefined)).toBe(true)
    expect(UndefinableEq(S.Eq).equals(undefined, 'a')).toBe(false)
  })
})

describe('UndefinableEq of NullableEq (an optional field that can be null)', () => {
  const OptionalNullableEq = UndefinableEq(NullableEq(S.Eq))

  it('tells "not given" (undefined) from "given as none" (null)', () => {
    expect(OptionalNullableEq.equals(undefined, null)).toBe(false)
    expect(OptionalNullableEq.equals(null, undefined)).toBe(false)
  })

  it('takes the same missing value on both sides as equal', () => {
    expect(OptionalNullableEq.equals(undefined, undefined)).toBe(true)
    expect(OptionalNullableEq.equals(null, null)).toBe(true)
    expect(OptionalNullableEq.equals('a', 'a')).toBe(true)
  })
})
