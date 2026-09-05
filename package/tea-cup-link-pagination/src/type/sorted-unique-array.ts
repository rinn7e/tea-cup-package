import { sortAndRemoveDup } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import type * as OrdClass from 'fp-ts/lib/Ord'
import { type Predicate } from 'fp-ts/lib/Predicate'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

export type SortedUniqueArray<A> = {
  readonly _tag: 'SortedUniqueArray'
  readonly value: A[]
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

export const unsafeFromArray = <A>(arr: A[]): SortedUniqueArray<A> => {
  return {
    _tag: 'SortedUniqueArray',
    value: arr,
  }
}

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
    if (val !== undefined) return O.some(val)
    return O.none
  }

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

export const deleteAtOrKeep =
  <A>(i: number) =>
  (arr: SortedUniqueArray<A>): SortedUniqueArray<A> => {
    return pipe(
      arr,
      deleteAt(i),
      O.getOrElse(() => arr),
    )
  }

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
