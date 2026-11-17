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
import type * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import * as A from 'fp-ts/lib/Array'
import type * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as Ord from 'fp-ts/lib/Ord'
import * as Set from 'fp-ts/lib/Set'
import { pipe } from 'fp-ts/lib/function'

import {
  type Edge,
  type HeldPage,
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
} from './type'

// -------------------------------------------
// Helper
// -------------------------------------------

export const isItemEqual =
  <Item, Parent, ItemMsg>(config: LogicConfig<Item, Parent, ItemMsg>) =>
  (a1: Item, a2: Item): boolean =>
    config.uniqueKeyField(a1) === config.uniqueKeyField(a2)

// The `Eq` that compares items by key (`uniqueKeyField`).
export const keyEq = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
): EqClass.Eq<Item> => ({ equals: isItemEqual(config) })

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

// Let an end that had nothing more load again. A load in flight or a failure
// is kept.
export const reopenEdge = (edge: Edge): Edge =>
  edge._tag === 'Exhausted' ? { _tag: 'Idle' } : edge

// Reopen the older end.
// Mainly used when a new list syncs.
// (A new list has few items, so its older end is exhausted right away.
// When syncing brings more old items, it has to reopen)
export const reopenPrev = <Item>(model: Model<Item>): Model<Item> => ({
  ...model,
  mode: { ...model.mode, prev: reopenEdge(model.mode.prev) },
})

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
        keyEq(config),
        config.ord,
      )((i, x) => (i === idx ? item : x))(arr)
    } else {
      // console.log(
      //   '[MSG_STATE][upsert] previousId not found, appending new item',
      // )
      return SUA.concat(keyEq(config), config.ord)([item])(arr)
    }
  } else {
    const idx = SUA.findIndex<Item>((x) => key(x) === key(item))(arr)
    // console.log('[MSG_STATE][upsert] key(item):', key(item), 'idx:', idx)
    return idx >= 0
      ? SUA.mapWithIndex<Item>(
          keyEq(config),
          config.ord,
        )((i, x) => (i === idx ? item : x))(arr)
      : SUA.concat(keyEq(config), config.ord)([item])(arr)
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
  return (model: Model<Item>): Model<Item> => {
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

    // console.log('[MSG_STATE][addOrUpdateData] result', {
    //   overallData,
    // })

    return {
      ...model,
      mode: { ...model.mode, overallData },
    }
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

// Whether the newest item's "go to latest" button shows: unless the newest
// item is loaded (nothing newer to load) and its row is shown (`view`, from
// the scroll container: the end of a reversed list, the start of another).
// Nothing loaded shows no button.
export const isLatestButtonVisible = <Item>(
  model: Model<Item>,
  isReversed: boolean,
  view: ScrollContainer.OverlayView,
): boolean =>
  model.mode.overallData.value.length > 0 &&
  !(
    model.mode.next._tag === 'Exhausted' &&
    (isReversed ? view.endShown : view.startShown)
  )

// The page `msg` carries, if it is one (`Model.heldPages`)
export const heldPageOf = <Item, ItemMsg, Route>(
  msg: Msg<Item, ItemMsg, Route>,
): HeldPage<Item> | null => {
  switch (msg._tag) {
    case 'GetMorePrevDataFromCacheResponse':
    case 'GetMorePrevDataFromApiResponse':
    case 'GetMoreNextDataFromCacheResponse':
    case 'GetMoreNextDataFromApiResponse':
      return msg
    default:
      return null
  }
}

// Whether the scroll container reports its header or footer for the end
// `edge` (`watchEdges`): an end that can load, once the first page is
// `Loaded`. A failed end loads again only by its Retry.
export const isEdgeWatched = <Item>(model: Model<Item>, edge: Edge): boolean =>
  edge._tag === 'Idle' && model.mode.initial._tag === 'Loaded'
