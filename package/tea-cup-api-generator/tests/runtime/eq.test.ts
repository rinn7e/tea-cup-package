import type * as EqClass from 'fp-ts/Eq'
import * as N from 'fp-ts/number'
import * as S from 'fp-ts/string'
import * as t from 'io-ts'
import { describe, expect, it } from 'vitest'

import {
  discriminatedEq,
  intersectionEq,
  lazyEq,
  structEq,
  unionEq,
  unknownEq,
} from '../../src'

describe('structEq', () => {
  const eq = structEq({ name: S.Eq, age: N.Eq })

  it('compares field by field', () => {
    expect(eq.equals({ name: 'a', age: 1 }, { name: 'a', age: 1 })).toBe(true)
    expect(eq.equals({ name: 'a', age: 1 }, { name: 'a', age: 2 })).toBe(false)
  })

  it('takes a missing optional field as equal only to a missing one', () => {
    expect(eq.equals({ name: 'a' }, { name: 'a' })).toBe(true)
    expect(eq.equals({ name: 'a' }, { name: 'a', age: 1 })).toBe(false)
  })
})

describe('discriminatedEq', () => {
  const eq = discriminatedEq('kind', {
    cat: structEq({ kind: S.Eq, lives: N.Eq }),
    dog: structEq({ kind: S.Eq, barks: S.Eq }),
  })

  it('compares values of one tag by the Eq of that tag', () => {
    expect(
      eq.equals({ kind: 'cat', lives: 9 }, { kind: 'cat', lives: 9 }),
    ).toBe(true)
    expect(
      eq.equals({ kind: 'cat', lives: 9 }, { kind: 'cat', lives: 8 }),
    ).toBe(false)
  })

  it('takes values of different tags as different', () => {
    expect(
      eq.equals({ kind: 'cat', lives: 9 }, { kind: 'dog', barks: 'woof' }),
    ).toBe(false)
  })
})

describe('unionEq', () => {
  const eq = unionEq([
    [t.string, S.Eq],
    [t.type({ n: t.number }), structEq({ n: N.Eq })],
  ])

  it('compares two values of one member with that member', () => {
    expect(eq.equals({ n: 1 }, { n: 1 })).toBe(true)
    expect(eq.equals('a', 'b')).toBe(false)
  })

  it('takes values of different members as different', () => {
    expect(eq.equals('a', { n: 1 })).toBe(false)
  })
})

describe('intersectionEq', () => {
  it('holds when every part holds', () => {
    const eq = intersectionEq([structEq({ a: N.Eq }), structEq({ b: N.Eq })])
    expect(eq.equals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(eq.equals({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
  })
})

describe('unknownEq', () => {
  it('compares JSON data deeply, objects in any key order', () => {
    expect(
      unknownEq.equals(
        { a: [1, { b: 2 }], c: null },
        { c: null, a: [1, { b: 2 }] },
      ),
    ).toBe(true)
    expect(unknownEq.equals({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(unknownEq.equals({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })
})

describe('lazyEq', () => {
  it('builds the Eq of a recursive type on first use, once', () => {
    type Tree = { children: Tree[] }
    let builds = 0
    const TreeEq: EqClass.Eq<Tree> = lazyEq<Tree>(() => {
      builds += 1
      return structEq({
        children: {
          equals: (x: Tree[], y: Tree[]): boolean =>
            x.length === y.length && x.every((c, i) => TreeEq.equals(c, y[i])),
        },
      })
    })
    expect(builds).toBe(0)
    expect(
      TreeEq.equals(
        { children: [{ children: [] }] },
        { children: [{ children: [] }] },
      ),
    ).toBe(true)
    expect(
      TreeEq.equals({ children: [] }, { children: [{ children: [] }] }),
    ).toBe(false)
    expect(builds).toBe(1)
  })
})
