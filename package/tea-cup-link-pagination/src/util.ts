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

export const isItemEqual =
  <Item, Parent, ItemMsg>(config: LogicConfig<Item, Parent, ItemMsg>) =>
  (a1: Item, a2: Item): boolean =>
    config.uniqueKeyField(a1) === config.uniqueKeyField(a2)

// Remove duplicated items. The array must be sorted first.
export const removeDup =
  <Item>({
    ord,
    uniqueKeyField,
  }: {
    ord: Ord.Ord<Item>
    uniqueKeyField: (item: Item) => string
  }) =>
  (arr: Item[]) => {
    const dataEq: EqClass.Eq<Item> = {
      equals: (first, second) =>
        uniqueKeyField(first) === uniqueKeyField(second),
    }

    return Set.toArray(ord)(Set.fromArray(dataEq)(arr))
  }

// Concat data at the end, removing duplicating if it exists
export const concatRemoveDup = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  currentData: Item[],
  incomingData: Item[],
): Item[] => {
  const uniqueIncomingData = filterUnique(
    isItemEqual(config),
    incomingData,
    currentData,
  )
  return currentData.concat(uniqueIncomingData)
}

// Concat data at the front, removing duplicating if it exists
export const concatFrontRemoveDup = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  currentData: Item[],
  incomingData: Item[],
): Item[] => {
  const uniqueIncomingData = filterUnique(
    isItemEqual(config),
    incomingData,
    currentData,
  )
  return uniqueIncomingData.concat(currentData)
}

// Concat data at the front, if the data exists, we overwrite it
export const concatFrontOverwriteDup = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  currentData: Item[],
  incomingData: Item[],
): Item[] => {
  const uniqueCurrentData = filterUnique(
    isItemEqual(config),
    currentData,
    incomingData,
  )
  return incomingData.concat(uniqueCurrentData)
}

export const getNewCurrentData =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    oldCurrentData: Item,
    oldCurrentDataIndex: number | null,
  ) =>
  (allData: Item[]): [Item[], Item] => {
    const currentIndex = allData.findIndex((item) =>
      isItemEqual(config)(item, oldCurrentData),
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
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    oldCurrentData: Item,
    oldCurrentDataIndex: number | null,
  ) =>
  (allData: Item[]): [Item[], Option<Item>] => {
    const currentIndex = allData.findIndex((item) =>
      isItemEqual(config)(item, oldCurrentData),
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

export const modeToArray = <Item>(mode: Mode<Item>): Item[] => {
  return mode.overallData.value
}

// Remove a item out of an array
export const removeElFromArray = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  currentData: Item,
  incomingData: Item[],
): Item[] => {
  return pipe(
    incomingData,
    A.filter((el) => !isItemEqual(config)(currentData, el)),
  )
}

// Revert prevIsMax to false if prevIsMax is true.
// Mainly used to revert prevIsMax on syncing new bundle.
// (Since new bundle has few Data, prevIsMax is reached right away.
// When there are more old Data from syncing, we have to reset prevIsMax)
export const revertPrevIsMax = <Item>(model: Model<Item>): Model<Item> => {
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
export const upsertWithPrevious = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  arr: SortedUniqueArray<Item>,
  item: Item,
  key: (item: Item) => string,
  previousId: string | null,
  comparePrevId: (item: Item, prevId: string) => boolean,
): SortedUniqueArray<Item> => {
  if (previousId) {
    const idx = SUA.findIndex<Item>((x) => comparePrevId(x, previousId))(arr)
    // console.log('[MSG_STATE][upsert] previousId:', previousId, 'idx:', idx)
    if (idx >= 0) {
      // console.log('[MSG_STATE][upsert] replacing existing item at index', idx)
      return SUA.mapWithIndex<Item>(
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
    const idx = SUA.findIndex<Item>((x) => key(x) === key(item))(arr)
    // console.log('[MSG_STATE][upsert] key(item):', key(item), 'idx:', idx)
    return idx >= 0
      ? SUA.mapWithIndex<Item>(
          config.eqWithKey,
          config.ord,
        )((i, x) => (i === idx ? item : x))(arr)
      : SUA.concat(config.eqWithKey, config.ord)([item])(arr)
  }
}

export const getChangeEvent = <Item>(
  prevArr: SortedUniqueArray<Item>,
  data: Item,
  ord: Ord.Ord<Item>,
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
export function addOrUpdateData<Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  data: Item,
  previousId: string | null,
  comparePreviousId: (data: Item, prevId: string) => boolean = () => false,
) {
  return (model: Model<Item>): [Model<Item>, ContainerChangeEvent] => {
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
export const replaceFuncActionHandler = <Item, Route>(
  model: Model<Item>,
  func: (
    as: SortedUniqueArray<Item>,
  ) => [SortedUniqueArray<Item>, AppRouteUpdater<Route>],
): [Model<Item>, AppRouteUpdater<Route>] => {
  const allData = model.mode.overallData
  const [newAllData, routeUpdater] = pipe(allData, (as) => func(as))
  return [
    {
      ...model,
      mode: {
        ...model.mode,
        overallData: newAllData,
      } satisfies Mode<Item>,
      // ^ Note, we should use `statisfied` for every object spread update
      // because: https://github.com/microsoft/TypeScript/issues/39998
    },
    routeUpdater,
  ]
}

// The same as `replaceFuncActionHandler` but can run async func
// Note: There is a different such that when current data is not found, switch to latest mode
// Consider doing this for the non-async version as well.
export const replaceFuncActionHandlerAsync = async <Item, Route>(
  model: Model<Item>,
  func: (
    items: SortedUniqueArray<Item>,
  ) => Promise<[SortedUniqueArray<Item>, AppRouteUpdater<Route>]>,
): Promise<[Model<Item>, AppRouteUpdater<Route>]> => {
  const allData = model.mode.overallData
  const [newAllData, routeUpdater] = await func(allData)
  return [
    {
      ...model,
      mode: {
        ...model.mode,
        overallData: newAllData,
      } satisfies Mode<Item>,
      // ^ Note, we should use `statisfied` for every object spread update
      // because: https://github.com/microsoft/TypeScript/issues/39998
    },
    routeUpdater,
  ]
}

// Get current selected data from link pagin state
export const getSelectedItem = <Item, Parent, ItemMsg>(
  logicConfig: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
): Option<Item> => {
  const selectedI = model.mode.selectedKey
    ? (model.mode.overallData.value as Item[]).findIndex(
        (item: Item) =>
          logicConfig.uniqueKeyField(item) === model.mode.selectedKey,
      )
    : -1

  const selectedItem =
    selectedI >= 0
      ? O.fromNullable(model.mode.overallData.value[selectedI])
      : O.none

  return selectedItem
}
