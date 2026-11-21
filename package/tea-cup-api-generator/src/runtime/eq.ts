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
import * as EqClass from 'fp-ts/Eq'

// Note [Generated Eq]
// ~~~~~~~~~~~~~~~~~~~
// Every schema gets `<Name>Eq`, a structural equality on the type its codec
// decodes to, so a decoded value can sit in a tea-cup model and a memoized
// view. The helpers here are what the generated instances are built from:
//
// - an object compares field by field (`structEq`);
// - a union with a `discriminator` compares the tag, then the member it names
//   (`discriminatedEq`);
// - another union finds the member each value belongs to with the `is` of its
//   codec, and compares with that member only when both values belong to the
//   same one (`unionEq`). Members that overlap (one a subtype of another) are
//   told apart by their order, as io-ts decodes them, so the first member can
//   ignore the fields of a later one: give such a union a `discriminator`;
// - `allOf` holds when every part holds (`intersectionEq`);
// - a value the spec leaves untyped is compared as JSON data (`unknownEq`);
// - a recursive schema refers to its own `Eq` lazily (`lazyEq`).

/**
 * The equality of an object, field by field. A missing optional field equals
 * only a missing one.
 */
export const structEq = (
  eqs: Record<string, EqClass.Eq<any>>,
): EqClass.Eq<any> =>
  EqClass.fromEquals((x, y) =>
    Object.entries(eqs).every(([key, eq]) =>
      x[key] === undefined || y[key] === undefined
        ? x[key] === y[key]
        : eq.equals(x[key], y[key]),
    ),
  )

/**
 * The equality of a union whose members carry a tag in `property`: values with
 * the same tag are compared by the `Eq` of that tag.
 */
export const discriminatedEq = (
  property: string,
  eqs: Record<string, EqClass.Eq<any>>,
): EqClass.Eq<any> =>
  EqClass.fromEquals((x, y) => {
    const tag = x[property]
    if (tag !== y[property]) {
      return false
    } else {
      const eq = eqs[tag]
      return eq === undefined ? unknownEq.equals(x, y) : eq.equals(x, y)
    }
  })

export type UnionMember = [{ is: (u: unknown) => boolean }, EqClass.Eq<any>]

// The equality of an untagged union; see Note [Generated Eq]
export const unionEq = (members: UnionMember[]): EqClass.Eq<any> =>
  EqClass.fromEquals((x, y) => {
    const xIndex = members.findIndex(([codec]) => codec.is(x))
    const yIndex = members.findIndex(([codec]) => codec.is(y))
    if (xIndex === -1 || yIndex === -1) {
      return unknownEq.equals(x, y)
    } else if (xIndex !== yIndex) {
      return false
    } else {
      return members[xIndex][1].equals(x, y)
    }
  })

export const intersectionEq = (eqs: EqClass.Eq<any>[]): EqClass.Eq<any> =>
  EqClass.fromEquals((x, y) => eqs.every((eq) => eq.equals(x, y)))

/**
 * The equality of JSON data: primitives by value, arrays by their items in
 * order, objects by their keys (in any order) and values.
 */
export const unknownEq: EqClass.Eq<unknown> = EqClass.fromEquals((x, y) =>
  jsonEquals(x, y),
)

const jsonEquals = (x: unknown, y: unknown): boolean => {
  if (x === y) {
    return true
  } else if (Array.isArray(x) && Array.isArray(y)) {
    return x.length === y.length && x.every((item, i) => jsonEquals(item, y[i]))
  } else if (isRecord(x) && isRecord(y)) {
    const xKeys = Object.keys(x).filter((key) => x[key] !== undefined)
    const yKeys = Object.keys(y).filter((key) => y[key] !== undefined)
    return (
      xKeys.length === yKeys.length &&
      xKeys.every((key) => jsonEquals(x[key], y[key]))
    )
  } else {
    return false
  }
}

const isRecord = (u: unknown): u is Record<string, unknown> =>
  typeof u === 'object' && u !== null && !Array.isArray(u)

/**
 * An `Eq` built on first use, for a recursive schema whose `Eq` refers to
 * itself (or to another `Eq` declared after it).
 */
export const lazyEq = <A>(build: () => EqClass.Eq<A>): EqClass.Eq<A> => {
  let built: EqClass.Eq<A> | undefined = undefined
  return EqClass.fromEquals((x, y) => {
    if (built === undefined) {
      built = build()
    }
    return built.equals(x, y)
  })
}
