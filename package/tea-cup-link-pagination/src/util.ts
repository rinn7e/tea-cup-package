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
import { filterUnique } from '@rinn7e/tea-cup-prelude'
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { type SortedUniqueArray } from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as A from 'fp-ts/lib/Array'
import type * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as Ord from 'fp-ts/lib/Ord'
import * as Set from 'fp-ts/lib/Set'
import { pipe } from 'fp-ts/lib/function'

import {
  type ContainerChangeEvent,
  type LogicConfig,
  type Mode,
  type Model,
} from './type'

// -------------------------------------------
// Helper
// -------------------------------------------

export const isAEqual =
  <A, B, amsg>(config: LogicConfig<A, B, amsg>) =>
  (a1: A, a2: A): boolean =>
    config.uniqueKeyField(a1) === config.uniqueKeyField(a2)

// Remove duplicated A. The array must be sorted first.
export const removeDup =
  <A>({
    ord,
    uniqueKeyField,
  }: {
    ord: Ord.Ord<A>
    uniqueKeyField: (a: A) => string
  }) =>
  (arr: A[]) => {
    const dataEq: EqClass.Eq<A> = {
      equals: (first, second) =>
        uniqueKeyField(first) === uniqueKeyField(second),
    }

    return Set.toArray(ord)(Set.fromArray(dataEq)(arr))
  }

// Concat data at the end, removing duplicating if it exists
export const concatRemoveDup = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    incomingData,
    currentData,
  )
  return currentData.concat(uniqueIncomingData)
}

// Concat data at the front, removing duplicating if it exists
export const concatFrontRemoveDup = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    incomingData,
    currentData,
  )
  return uniqueIncomingData.concat(currentData)
}

// Concat data at the front, if the data exists, we overwrite it
export const concatFrontOverwriteDup = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  currentData: A[],
  incomingData: A[],
): A[] => {
  const uniqueCurrentData = filterUnique(
    isAEqual(config),
    currentData,
    incomingData,
  )
  return incomingData.concat(uniqueCurrentData)
}

export const getNewCurrentData =
  <A, B, amsg>(
    config: LogicConfig<A, B, amsg>,
    oldCurrentData: A,
    oldCurrentDataIndex: number | null,
  ) =>
  (allData: A[]): [A[], A] => {
    const currentIndex = allData.findIndex((a) =>
      isAEqual(config)(a, oldCurrentData),
    )
    if (currentIndex >= 0) {
      const current = allData[currentIndex]
      return [allData, current]
    }
    // Sometimes `oldCurrentData` no longer exists, so we use
    // `oldCurrentDataIndex` if it is available.
    else if (oldCurrentDataIndex !== null && oldCurrentDataIndex >= 0) {
      const current = allData[oldCurrentDataIndex]
      return [allData, current]
    }
    // In last resort, pick the first item
    // (happen when the link id get deleted/replaced.)
    else {
      console.warn('getNewCurrentData: cannot find current data index.')
      return [allData, allData[0]]
    }
  }

// The same as `getNewCurrentData` but return O.none if current data is not found
export const getNewCurrentDataO =
  <A, B, amsg>(
    config: LogicConfig<A, B, amsg>,
    oldCurrentData: A,
    oldCurrentDataIndex: number | null,
  ) =>
  (allData: A[]): [A[], Option<A>] => {
    const currentIndex = allData.findIndex((a) =>
      isAEqual(config)(a, oldCurrentData),
    )
    if (currentIndex >= 0) {
      const current = allData[currentIndex]
      return [allData, O.some(current)]
    }
    // Sometimes `oldCurrentData` no longer exists, so we use
    // `oldCurrentDataIndex` if it is available.
    else if (oldCurrentDataIndex) {
      const current = allData[oldCurrentDataIndex]
      return [allData, O.some(current)]
    } else {
      return [allData, O.none]
    }
  }

export const modeToArray = <A>(mode: Mode<A>): A[] => {
  return mode.overallData.value
}

// Remove a item out of an array
export const removeElFromArray = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  currentData: A,
  incomingData: A[],
): A[] => {
  return pipe(
    incomingData,
    A.filter((el) => !isAEqual(config)(currentData, el)),
  )
}

// Revert prevIsMax to false if prevIsMax is true.
// Mainly used to revert prevIsMax on syncing new bundle.
// (Since new bundle has few Data, prevIsMax is reached right away.
// When there are more old Data from syncing, we have to reset prevIsMax)
export const revertPrevIsMax = <A>(model: Model<A>): Model<A> => {
  if (model.mode.prevIsMax) {
    return {
      ...model,
      mode: {
        ...model.mode,
        prevIsMax: false,
      },
    }
  } else return model
}

/**
 * If the previousId is provided, in case it is found in the arr
 * directly replace it with the new data
 */
export const upsertWithPrevious = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  arr: SortedUniqueArray<A>,
  item: A,
  key: (a: A) => string,
  previousId: string | null,
  comparePrevId: (a: A, prevId: string) => boolean,
): SortedUniqueArray<A> => {
  if (previousId) {
    const idx = SUA.findIndex<A>((x) => comparePrevId(x, previousId))(arr)
    // console.log('[MSG_STATE][upsert] previousId:', previousId, 'idx:', idx)
    if (idx >= 0) {
      // console.log('[MSG_STATE][upsert] replacing existing item at index', idx)
      return SUA.mapWithIndex<A>(
        config.eqWithKey,
        config.ord,
      )((i, x) => (i === idx ? item : x))(arr)
    } else {
      // console.log(
      //   '[MSG_STATE][upsert] previousId not found, appending new item',
      // )
      return SUA.concat(config.eqWithKey, config.ord)([item])(arr)
    }
  } else {
    const idx = SUA.findIndex<A>((x) => key(x) === key(item))(arr)
    // console.log('[MSG_STATE][upsert] key(item):', key(item), 'idx:', idx)
    return idx >= 0
      ? SUA.mapWithIndex<A>(
          config.eqWithKey,
          config.ord,
        )((i, x) => (i === idx ? item : x))(arr)
      : SUA.concat(config.eqWithKey, config.ord)([item])(arr)
  }
}

export const getChangeEvent = <A>(
  prevArr: SortedUniqueArray<A>,
  data: A,
  ord: Ord.Ord<A>,
  isReversed: boolean,
): ContainerChangeEvent => {
  const head = prevArr.value[0]
  if (!head) return { _tag: 'NoChange' } as ContainerChangeEvent

  // Sorts before the current head => rendered at DOM index 0 of the
  // (possibly reversed) list.
  const insertsAtSortHead = Ord.lt(ord)(data, head)

  if (isReversed) {
    // Chat mode: the sort head is rendered at the BOTTOM.
    return insertsAtSortHead
      ? ({ _tag: 'ElementModifyOnBottom' } as ContainerChangeEvent)
      : ({ _tag: 'ElementModifyOnTop' } as ContainerChangeEvent)
  } else {
    // Standard mode: the sort head is rendered at the TOP.
    return insertsAtSortHead
      ? ({ _tag: 'ElementModifyOnTop' } as ContainerChangeEvent)
      : ({ _tag: 'ElementModifyOnBottom' } as ContainerChangeEvent)
  }
}

// Update an existing data with new value (identifier stays the same).
// If the value does not exist, add it.
export function addOrUpdateData<A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  data: A,
  previousId: string | null,
  comparePreviousId: (data: A, prevId: string) => boolean = () => false,
) {
  return (model: Model<A>): [Model<A>, ContainerChangeEvent] => {
    // console.log('[MSG_STATE][] start', {
    //   previousId,
    //   data,
    //   overallData: model.mode.overallData,
    //   mode: model.mode,
    // })

    const overallData = upsertWithPrevious(
      config,
      model.mode.overallData,
      data,
      config.uniqueKeyField,
      previousId,
      comparePreviousId,
    )

    const event = getChangeEvent(
      model.mode.overallData,
      data,
      config.ord,
      config.isReversed,
    )

    // console.log('[MSG_STATE][addOrUpdateData] result', {
    //   overallData,
    //   event,
    // })

    return [
      {
        ...model,
        mode: { ...model.mode, overallData },
      },
      event,
    ]
  }
}
// Given a function, run it against all the data
// Sort and run reprocessStateFunc at the end
export const replaceFuncActionHandler = <A, Route>(
  model: Model<A>,
  func: (
    as: SortedUniqueArray<A>,
  ) => [SortedUniqueArray<A>, AppRouteUpdater<Route>],
): [Model<A>, AppRouteUpdater<Route>] => {
  const allData = model.mode.overallData
  const [newAllData, routeUpdater] = pipe(allData, (as) => func(as))
  return [
    {
      ...model,
      mode: {
        ...model.mode,
        overallData: newAllData,
      } satisfies Mode<A>,
      // ^ Note, we should use `statisfied` for every object spread update
      // because: https://github.com/microsoft/TypeScript/issues/39998
    },
    routeUpdater,
  ]
}

// The same as `replaceFuncActionHandler` but can run async func
// Note: There is a different such that when current data is not found, switch to latest mode
// Consider doing this for the non-async version as well.
export const replaceFuncActionHandlerAsync = async <A, Route>(
  model: Model<A>,
  func: (
    a: SortedUniqueArray<A>,
  ) => Promise<[SortedUniqueArray<A>, AppRouteUpdater<Route>]>,
): Promise<[Model<A>, AppRouteUpdater<Route>]> => {
  const allData = model.mode.overallData
  const [newAllData, routeUpdater] = await func(allData)
  return [
    {
      ...model,
      mode: {
        ...model.mode,
        overallData: newAllData,
      } satisfies Mode<A>,
      // ^ Note, we should use `statisfied` for every object spread update
      // because: https://github.com/microsoft/TypeScript/issues/39998
    },
    routeUpdater,
  ]
}

// Get current selected data from link pagin state
export const getSelectedA = <A, B, amsg>(
  logicConfig: LogicConfig<A, B, amsg>,
  model: Model<A>,
): Option<A> => {
  const selectedI = model.mode.selectedKey
    ? (model.mode.overallData.value as A[]).findIndex(
        (a: A) => logicConfig.uniqueKeyField(a) === model.mode.selectedKey,
      )
    : -1

  const selectedA =
    selectedI >= 0
      ? O.fromNullable(model.mode.overallData.value[selectedI])
      : O.none

  return selectedA
}
