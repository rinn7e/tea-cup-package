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
import * as O from 'fp-ts/lib/Option'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { describe, expect, it } from 'vitest'

import * as CacheData from '../src/type/cache-data'
import {
  HttpErrorEq,
  HttpErrorStringEq,
  mkHttpError,
} from '../src/type/http-error'
import { SizeEq, SizeJson, SizeOrd, size } from '../src/type/size'
import * as SUA from '../src/type/sorted-unique-array'

describe('Size', () => {
  it('compares and decodes as a number', () => {
    expect(SizeEq.equals(size(1), size(1))).toBe(true)
    expect(SizeOrd.compare(size(1), size(2))).toBe(-1)
    expect(SizeJson.decode(10)).toEqual(E.right(10))
    expect(E.isLeft(SizeJson.decode('10'))).toBe(true)
  })
})

describe('HttpError', () => {
  it('mkHttpError defaults to status 400', () => {
    expect(mkHttpError('bad')).toEqual({
      statusCode: 400,
      err: 'bad',
      actualErr: 'bad',
    })
    expect(mkHttpError('nf', 404).statusCode).toBe(404)
  })

  it('HttpErrorEq compares every field', () => {
    expect(HttpErrorStringEq.equals(mkHttpError('a'), mkHttpError('a'))).toBe(
      true,
    )
    expect(HttpErrorStringEq.equals(mkHttpError('a'), mkHttpError('b'))).toBe(
      false,
    )
    const eq = HttpErrorEq(S.Eq)
    expect(
      eq.equals(
        { statusCode: 500, err: null, actualErr: 'x' },
        { statusCode: 500, err: null, actualErr: 'x' },
      ),
    ).toBe(true)
    expect(
      eq.equals(
        { statusCode: 500, err: '', actualErr: 'x' },
        { statusCode: 500, err: null, actualErr: 'x' },
      ),
    ).toBe(false)
  })
})

describe('CacheData', () => {
  it('fromRD / fromO / fromNullable wrap data with an updatedAt', () => {
    expect(CacheData.fromRD(RD.success(1)).data).toEqual(RD.success(1))
    expect(CacheData.fromO(O.some(1)).data).toEqual(RD.success(1))
    expect(CacheData.fromO(O.none).data).toEqual(RD.initial)
    expect(CacheData.fromNullable(1).data).toEqual(RD.success(1))
    expect(CacheData.fromNullable(null).data).toEqual(RD.initial)
    // falsy values are real values, not "missing"
    expect(CacheData.fromNullable(0).data).toEqual(RD.success(0))
    expect(CacheData.fromNullable('').data).toEqual(RD.success(''))
    expect(CacheData.fromNullable(false).data).toEqual(RD.success(false))
    expect(CacheData.fromRD(RD.initial).updatedAt).toBeInstanceOf(Date)
  })

  it('map transforms the success value and keeps updatedAt', () => {
    const cache = CacheData.fromRD(RD.success(2))
    const mapped = CacheData.map((n: number) => n * 3)(cache)
    expect(mapped.data).toEqual(RD.success(6))
    expect(mapped.updatedAt).toBe(cache.updatedAt)
  })

  it('isValidPendingCache rejects pending caches older than 1 second', () => {
    expect(CacheData.isValidPendingCache(CacheData.fromRD(RD.pending))).toBe(
      true,
    )
    expect(
      CacheData.isValidPendingCache({
        data: RD.pending,
        updatedAt: new Date(Date.now() - 5000),
      }),
    ).toBe(false)
    expect(
      CacheData.isValidPendingCache({
        data: RD.success(1),
        updatedAt: new Date(Date.now() - 5000),
      }),
    ).toBe(true)
  })

  it('Json round-trips a cache value', () => {
    const codec = CacheData.Json(SizeJson)
    const cache = { data: RD.success(size(3)), updatedAt: new Date(0) }
    expect(codec.decode(codec.encode(cache))).toEqual(E.right(cache))
  })
})

describe('SortedUniqueArray', () => {
  const from = SUA.fromArray(N.Eq, N.Ord)

  it('fromArray sorts and removes duplicates', () => {
    expect(from([3, 1, 2, 3]).value).toEqual([1, 2, 3])
    expect(SUA.empty<number>().value).toEqual([])
  })

  it('getEq compares the underlying values', () => {
    expect(SUA.getEq(N.Eq).equals(from([2, 1]), from([1, 2]))).toBe(true)
    expect(SUA.getEq(N.Eq).equals(from([1]), from([1, 2]))).toBe(false)
  })

  it('lookup / findIndex / findIndexOption', () => {
    const arr = from([10, 20, 30])
    expect(SUA.lookup<number>(1)(arr)).toEqual(O.some(20))
    expect(SUA.lookup<number>(9)(arr)).toEqual(O.none)
    // falsy elements are found, not treated as missing
    expect(SUA.lookup<number>(0)(from([0, 1]))).toEqual(O.some(0))
    expect(
      SUA.lookup<string>(0)(SUA.fromArray(S.Eq, S.Ord)(['', 'a'])),
    ).toEqual(O.some(''))
    expect(SUA.findIndex((n: number) => n === 30)(arr)).toBe(2)
    expect(SUA.findIndexOption((n: number) => n === 99)(arr)).toEqual(O.none)
  })

  it('filter keeps the order', () => {
    expect(SUA.filter((n: number) => n !== 2)(from([1, 2, 3])).value).toEqual([
      1, 3,
    ])
  })

  it('deleteAt / deleteAtOrKeep', () => {
    const arr = from([1, 2, 3])
    expect(O.map(SUA.unsafeFromArray)(O.some([1, 3]))).toEqual(
      SUA.deleteAt<number>(1)(arr),
    )
    expect(SUA.deleteAt<number>(9)(arr)).toEqual(O.none)
    expect(SUA.deleteAtOrKeep<number>(9)(arr)).toBe(arr)
  })

  it('concat / map / filterMap / mapWithIndex re-sort and dedupe', () => {
    const arr = from([1, 3])
    expect(SUA.concat(N.Eq, N.Ord)([2, 3])(arr).value).toEqual([1, 2, 3])
    expect(SUA.map(N.Eq, N.Ord)((n) => 10 - n)(arr).value).toEqual([7, 9])
    expect(
      SUA.filterMap(N.Eq, N.Ord)((n) => (n > 1 ? O.some(n) : O.none))(arr)
        .value,
    ).toEqual([3])
    expect(SUA.mapWithIndex(N.Eq, N.Ord)((i, n) => n + i)(arr).value).toEqual([
      1, 4,
    ])
  })

  it('modifyAt / modifyAtOrKeep re-sort after the change', () => {
    const arr = from([1, 2, 3])
    expect(
      O.map((a: SUA.SortedUniqueArray<number>) => a.value)(
        SUA.modifyAt(N.Eq, N.Ord)(0, () => 5)(arr),
      ),
    ).toEqual(O.some([2, 3, 5]))
    expect(SUA.modifyAtOrKeep(N.Eq, N.Ord)(9, () => 5)(arr)).toBe(arr)
  })

  it('updateAt / updateAtOrKeep replace in place', () => {
    const arr = from([1, 2, 3])
    expect(
      O.map((a: SUA.SortedUniqueArray<number>) => a.value)(
        SUA.updateAt(1, 20)(arr),
      ),
    ).toEqual(O.some([1, 20, 3]))
    expect(SUA.updateAtOrKeep(9, 20)(arr)).toBe(arr)
  })
})
