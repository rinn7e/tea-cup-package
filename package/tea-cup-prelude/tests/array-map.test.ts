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
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import { ArrayExtra, MapExtra } from '../src'

describe('ArrayExtra', () => {
  it('modifyAtIfExist modifies an existing index', () => {
    expect(
      ArrayExtra.modifyAtIfExist(1, (n: number) => n * 10)([1, 2, 3]),
    ).toEqual([1, 20, 3])
  })

  it('modifyAtIfExist returns the same array when the index is missing', () => {
    const arr = [1, 2, 3]
    expect(ArrayExtra.modifyAtIfExist(5, (n: number) => n * 10)(arr)).toBe(arr)
  })

  it('arrayFormatter joins as an English list', () => {
    expect(ArrayExtra.arrayFormatter.format(['a', 'b', 'c'])).toBe(
      'a, b, and c',
    )
  })
})

describe('MapExtra', () => {
  it('modifyAtIfExist modifies an existing key', () => {
    const m = new Map([['a', 1]])
    expect(
      MapExtra.modifyAtIfExist(S.Eq)('a', (n: number) => n + 1)(m),
    ).toEqual(new Map([['a', 2]]))
  })

  it('modifyAtIfExist returns the same map when the key is missing', () => {
    const m = new Map([['a', 1]])
    expect(MapExtra.modifyAtIfExist(S.Eq)('b', (n: number) => n + 1)(m)).toBe(m)
  })

  it('lookupWithDefault falls back to the default value', () => {
    const m = new Map([[1, 'one']])
    expect(MapExtra.lookupWithDefault(N.Eq)(1)('none')(m)).toBe('one')
    expect(MapExtra.lookupWithDefault(N.Eq)(2)('none')(m)).toBe('none')
  })
})
