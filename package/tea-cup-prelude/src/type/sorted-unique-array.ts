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
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import type * as OrdClass from 'fp-ts/lib/Ord'
import { type Predicate } from 'fp-ts/lib/Predicate'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import { sortAndRemoveDup } from '../common'

// ----------------------------------------------------------
// SortedUniqueArray:
// - all elements are unique
// - always sorted
// - lookup by index is always O(1)
// (Mainly used in link pagin)
//
// Note: Eq instances used here is needed to remove duplication
// Provide a EqWithKey instance for faster processing.
// ----------------------------------------------------------

export type SortedUniqueArray<A> = {
  _tag: 'SortedUniqueArray'
  value: A[]
}

export function getEq<A>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<SortedUniqueArray<A>>({
    _tag: S.Eq,
    value: A.getEq(eqA),
  })
}

export const fromArray =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (arr: A[]): SortedUniqueArray<A> => {
    return {
      _tag: 'SortedUniqueArray',
      value: pipe(arr, sortAndRemoveDup(eqWithKey, ord)),
    }
  }

// Convert from array, without any sorting assuming the array is already sorted and unique
export const unsafeFromArray = <A>(arr: A[]): SortedUniqueArray<A> => {
  return {
    _tag: 'SortedUniqueArray',
    value: arr,
  }
}

// Operation that can't change the ordering
// ----------------------------------------------------------

export const empty = <A>(): SortedUniqueArray<A> => {
  return {
    _tag: 'SortedUniqueArray',
    value: [],
  }
}

export const lookup =
  <A>(i: number) =>
  (arr: SortedUniqueArray<A>): Option<A> => {
    const val = arr.value[i]
    if (val) return O.some(val)
    else return O.none
  }

// Note: `filter` can't change the ordering, so we don't have to re-sort.
export const filter =
  <A>(predicate: Predicate<A>) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return {
      _tag: 'SortedUniqueArray',
      value: pipe(arr.value, A.filter(predicate)),
    }
  }

export const findIndex =
  <A>(predicate: Predicate<A>) =>
  (arr: SortedUniqueArray<A>): number => {
    return arr.value.findIndex(predicate)
  }

export const findIndexOption =
  <A>(predicate: Predicate<A>) =>
  (arr: SortedUniqueArray<A>): Option<number> => {
    return A.findIndex(predicate)(arr.value)
  }

export const deleteAt =
  <A>(i: number) =>
  (arr: SortedUniqueArray<A>): Option<SortedUniqueArray<A>> => {
    return pipe(
      arr.value,
      A.deleteAt(i),
      O.map((value) => ({
        _tag: 'SortedUniqueArray',
        value,
      })),
    )
  }

// The same as deleteAt, but return the original array if i doesn't exist
export const deleteAtOrKeep =
  <A>(i: number) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(
      arr,
      deleteAt(i),
      O.getOrElse(() => arr),
    )
  }

// Operation that can change the ordering
// ----------------------------------------------------------

export const concat =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (second: A[]) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return {
      _tag: 'SortedUniqueArray',
      value: pipe(
        arr.value,
        A.concat(second),
        sortAndRemoveDup(eqWithKey, ord),
      ),
    }
  }

export const map =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (f: (a: A) => A) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(arr.value, A.map(f), fromArray(eqWithKey, ord))
  }

export const filterMap =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (f: (a: A) => Option<A>) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(arr.value, A.filterMap(f), fromArray(eqWithKey, ord))
  }

export const mapWithIndex =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (f: (i: number, a: A) => A) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(arr.value, A.mapWithIndex(f), fromArray(eqWithKey, ord))
  }

export const modifyAt =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (i: number, f: (a: A) => A) =>
  (arr: SortedUniqueArray<A>): Option<SortedUniqueArray<A>> => {
    return pipe(arr.value, A.modifyAt(i, f), O.map(fromArray(eqWithKey, ord)))
  }

// The same as modifyAt, but return the original array if i doesn't exist
export const modifyAtOrKeep =
  <A>(eqWithKey: EqClass.Eq<A>, ord: OrdClass.Ord<A>) =>
  (i: number, f: (a: A) => A) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(
      arr,
      modifyAt(eqWithKey, ord)(i, f),
      O.getOrElse(() => arr),
    )
  }

export const updateAt =
  <A>(i: number, newA: A) =>
  (arr: SortedUniqueArray<A>): Option<SortedUniqueArray<A>> => {
    return pipe(arr.value, A.updateAt(i, newA), O.map(unsafeFromArray))
  }

export const updateAtOrKeep =
  <A>(i: number, newA: A) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(
      arr,
      updateAt(i, newA),
      O.getOrElse(() => arr),
    )
  }
