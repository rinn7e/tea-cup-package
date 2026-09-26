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
import * as RD from '@devexperts/remote-data-ts'
import * as E from 'fp-ts/lib/Either'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import * as t from 'io-ts'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  EqAlways,
  NullableEq,
  RemoteDataJson,
  UndefinableEq,
  and,
  booleanFromString,
  booleanFromUndefinedWithDefault,
  brandedNumber,
  brandedString,
  capFirst,
  concatIfNotExist,
  concatOverwriteDup,
  decodeWithReport,
  diffIdList,
  errorToString,
  exec,
  filterUnique,
  getFirstLine,
  jsonParse,
  limitDecimal2Digit,
  lines,
  nonEmptyStr,
  or,
  rdConvertNullSuccessToInitial,
  sortAndRemoveDup,
  throttle,
  truncateText,
  unlines,
  unsafeFromNullable,
  unwords,
  words,
} from '../src'

describe('Boolean helpers', () => {
  it('and returns true only when every element is true', () => {
    expect(and([])).toBe(true)
    expect(and([true, true])).toBe(true)
    expect(and([true, false])).toBe(false)
  })

  it('or returns true when any element is true', () => {
    expect(or([])).toBe(false)
    expect(or([false, true])).toBe(true)
    expect(or([false, false])).toBe(false)
  })

  it('booleanFromString parses only "true" / "false"', () => {
    expect(booleanFromString('true')).toBe(true)
    expect(booleanFromString('false')).toBe(false)
  })

  it('booleanFromUndefinedWithDefault falls back to the default', () => {
    expect(booleanFromUndefinedWithDefault('true', false)).toBe(true)
    expect(booleanFromUndefinedWithDefault('false', true)).toBe(false)
    expect(booleanFromUndefinedWithDefault(undefined, true)).toBe(true)
  })
})

describe('String helpers', () => {
  it('words / unwords split and join on whitespace', () => {
    expect(words('a  b\tc')).toEqual(['a', 'b', 'c'])
    expect(unwords(['a', 'b'])).toBe('a b')
  })

  it('lines / unlines split and join on newlines (LF and CRLF)', () => {
    expect(lines('a\nb\r\nc')).toEqual(['a', 'b', 'c'])
    expect(unlines(['a', 'b'])).toBe('a\nb')
  })

  it('capFirst capitalizes only the first letter', () => {
    expect(capFirst('hello world')).toBe('Hello world')
    expect(capFirst('')).toBe('')
  })

  it('getFirstLine returns the text before the first newline', () => {
    expect(getFirstLine('first\nsecond')).toBe('first')
    expect(getFirstLine('only')).toBe('only')
  })

  it('truncateText slices over-limit text and appends the marker', () => {
    expect(truncateText('hello', 10)).toBe('hello')
    expect(truncateText('hello world', 5)).toBe('hello...')
    expect(truncateText('hello world', 5, '~')).toBe('hello~')
  })

  it('nonEmptyStr detects empty strings', () => {
    expect(nonEmptyStr('a')).toBe(true)
    expect(nonEmptyStr('')).toBe(false)
  })

  it('limitDecimal2Digit always formats with 2 decimals', () => {
    expect(limitDecimal2Digit(1)).toBe('1.00')
    expect(limitDecimal2Digit(1.5)).toBe('1.50')
    expect(limitDecimal2Digit(1.236)).toBe('1.24')
  })

  it('exec runs the thunk', () => {
    expect(exec(() => 1 + 1)).toBe(2)
  })
})

describe('Eq helpers', () => {
  it('NullableEq treats only null as missing', () => {
    const eq = NullableEq(N.Eq)
    expect(eq.equals(null, null)).toBe(true)
    expect(eq.equals(1, 1)).toBe(true)
    expect(eq.equals(1, 2)).toBe(false)
    expect(eq.equals(1, null)).toBe(false)
    expect(eq.equals(null, 1)).toBe(false)
    // falsy values are real values, not "missing"
    expect(eq.equals(0, null)).toBe(false)
    expect(eq.equals(null, 0)).toBe(false)
    expect(eq.equals(0, 0)).toBe(true)
    expect(NullableEq(S.Eq).equals('', null)).toBe(false)
    expect(NullableEq(B.Eq).equals(false, null)).toBe(false)
  })

  it('UndefinableEq treats only undefined as missing', () => {
    const eq = UndefinableEq(B.Eq)
    expect(eq.equals(undefined, undefined)).toBe(true)
    expect(eq.equals(true, true)).toBe(true)
    expect(eq.equals(true, false)).toBe(false)
    expect(eq.equals(true, undefined)).toBe(false)
    // falsy values are real values, not "missing"
    expect(eq.equals(false, undefined)).toBe(false)
    expect(eq.equals(undefined, false)).toBe(false)
    expect(eq.equals(false, false)).toBe(true)
    expect(UndefinableEq(N.Eq).equals(0, undefined)).toBe(false)
    expect(UndefinableEq(S.Eq).equals('', undefined)).toBe(false)
  })

  it('UndefinableEq(NullableEq) distinguishes null from undefined', () => {
    const eq = UndefinableEq(NullableEq(N.Eq))
    expect(eq.equals(null, null)).toBe(true)
    expect(eq.equals(undefined, undefined)).toBe(true)
    expect(eq.equals(null, undefined)).toBe(false)
    expect(eq.equals(0, null)).toBe(false)
    expect(eq.equals(0, 0)).toBe(true)
  })

  it('EqAlways is always equal', () => {
    expect(EqAlways.equals(1, 2)).toBe(true)
    expect(
      EqAlways.equals(
        () => 1,
        () => 2,
      ),
    ).toBe(true)
  })
})

describe('Array helpers', () => {
  const eqNum = (a: number, b: number) => a === b

  it('filterUnique keeps elements not present in the check list', () => {
    expect(filterUnique(eqNum, [1, 2, 3], [2])).toEqual([1, 3])
  })

  it('concatOverwriteDup appends incoming data, replacing duplicates', () => {
    type Item = { id: number; v: string }
    const eqId = (a: Item, b: Item) => a.id === b.id
    expect(
      concatOverwriteDup(
        eqId,
        [
          { id: 1, v: 'old' },
          { id: 2, v: 'keep' },
        ],
        [{ id: 1, v: 'new' }],
      ),
    ).toEqual([
      { id: 2, v: 'keep' },
      { id: 1, v: 'new' },
    ])
  })

  it('diffIdList returns ids in A but not in B', () => {
    expect(diffIdList(N.Eq)([2, 4])([1, 2, 3, 4])).toEqual([1, 3])
  })

  it('sortAndRemoveDup sorts and removes duplicates', () => {
    expect(sortAndRemoveDup(N.Eq, N.Ord)([3, 1, 3, 2, 1])).toEqual([1, 2, 3])
  })

  it('concatIfNotExist only appends missing values', () => {
    expect(concatIfNotExist(N.Eq)(3)([1, 2])).toEqual([1, 2, 3])
    expect(concatIfNotExist(N.Eq)(2)([1, 2])).toEqual([1, 2])
  })
})

describe('JSON / io-ts helpers', () => {
  it('jsonParse returns Right on valid JSON and Left on invalid JSON', () => {
    expect(jsonParse('{"a":1}')).toEqual(E.right({ a: 1 }))
    expect(E.isLeft(jsonParse('{bad'))).toBe(true)
  })

  it('decodeWithReport returns Right on success and a readable Left on failure', () => {
    const codec = t.type({ a: t.number })
    expect(decodeWithReport(codec, { a: 1 })).toEqual(E.right({ a: 1 }))
    const bad = decodeWithReport(codec, { a: 'x' })
    expect(E.isLeft(bad)).toBe(true)
    if (E.isLeft(bad)) {
      expect(bad.left).toContain('decodeWithReport error:')
    }
  })

  it('RemoteDataJson round-trips every RemoteData state', () => {
    const codec = RemoteDataJson(t.number)
    const states: RD.RemoteData<string, number>[] = [
      RD.initial,
      RD.failure('boom'),
      RD.success(1),
    ]
    for (const s of states) {
      expect(codec.decode(codec.encode(s))).toEqual(E.right(s))
    }
  })

  it('brandedString / brandedNumber accept only their primitive type', () => {
    const Str = brandedString<string>('Str')
    const Num = brandedNumber<number>('Num')
    expect(E.isRight(Str.decode('a'))).toBe(true)
    expect(E.isLeft(Str.decode(1))).toBe(true)
    expect(E.isRight(Num.decode(1))).toBe(true)
    expect(E.isLeft(Num.decode('a'))).toBe(true)
  })
})

describe('Misc helpers', () => {
  it('rdConvertNullSuccessToInitial turns Success(null) into Initial', () => {
    expect(rdConvertNullSuccessToInitial(RD.success(null))).toEqual(RD.initial)
    expect(rdConvertNullSuccessToInitial(RD.success(1))).toEqual(RD.success(1))
    expect(rdConvertNullSuccessToInitial(RD.failure('e'))).toEqual(
      RD.failure('e'),
    )
  })

  it('errorToString handles Error, string and objects', () => {
    expect(errorToString('plain')).toBe('plain')
    expect(errorToString({ a: 1 })).toBe('{"a":1}')
    expect(errorToString(new Error('boom'))).toContain('boom')
  })
})

describe('Falsy values are real values', () => {
  it('unsafeFromNullable keeps falsy values and throws only on null', () => {
    expect(unsafeFromNullable(0)).toBe(0)
    expect(unsafeFromNullable('')).toBe('')
    expect(unsafeFromNullable(false)).toBe(false)
    expect(() => unsafeFromNullable(null)).toThrow()
  })

  it('rdConvertNullSuccessToInitial keeps falsy success values', () => {
    expect(rdConvertNullSuccessToInitial(RD.success(0))).toEqual(RD.success(0))
    expect(rdConvertNullSuccessToInitial(RD.success(''))).toEqual(
      RD.success(''),
    )
    expect(rdConvertNullSuccessToInitial(RD.success(false))).toEqual(
      RD.success(false),
    )
  })
})

describe('words (haskell semantics)', () => {
  it('drops empty words from leading / trailing white space', () => {
    expect(words(' a  b ')).toEqual(['a', 'b'])
    expect(words('')).toEqual([])
    expect(words('   ')).toEqual([])
  })
})

describe('errorToString', () => {
  it('always returns a string', () => {
    expect(errorToString(undefined)).toBe('undefined')
    expect(typeof errorToString(() => 1)).toBe('string')
  })
})

describe('throttle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs immediately, then resolves superseded calls with the trailing result', async () => {
    vi.useFakeTimers()
    const calls: number[] = []
    const throttled = throttle((n: number) => {
      calls.push(n)
      return n
    }, 100)

    const first = throttled(1)
    const second = throttled(2)
    const third = throttled(3)

    expect(await first).toBe(1)
    vi.advanceTimersByTime(100)
    // `second` was superseded by `third`: it must still resolve (not hang)
    expect(await second).toBe(3)
    expect(await third).toBe(3)
    expect(calls).toEqual([1, 3])
  })
})
