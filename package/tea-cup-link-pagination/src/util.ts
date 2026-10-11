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
  type Edge,
  type LogicConfig,
  type Mode,
  type Model,
  type PendingChange,
  PendingChangeEq,
  type Refs,
  type ScrollSnapshot,
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
// Mainly used on syncing a new bundle.
// (Since a new bundle has few items, the older end is exhausted right away.
// When there are more old items from syncing, we have to reopen it)
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

// The container's snapshot, or the one the model already has: one taken for
// an earlier change, not rendered yet, is kept, since the container hasn't
// changed since.
const snapshotBefore = <Item>(
  refs: Refs,
  model: Model<Item>,
): ScrollSnapshot | null => {
  const container = refs.containerRef.current
  const pending =
    model.pendingChange._tag === 'KeepPosition'
      ? model.pendingChange.before
      : null
  return (
    pending ??
    (container
      ? {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
        }
      : null)
  )
}

// Set the change the view applies on its next render. For a change that keeps
// the scroll position, also take the container's snapshot: the model is updated
// before the change is rendered, so the container still shows the old rows,
// with everything that grew since included.
//
// Changes made before the view draws combine, the one that keeps the position
// winning: a change that moves nothing or lands below doesn't drop an earlier
// change on top (with its snapshot) that isn't drawn yet. Only the view, once
// it drew a change, clears it (`pendingChangeApplied`).
export const setContainerChangeEvent =
  (refs: Refs, event: ContainerChangeEvent) =>
  <Item>(model: Model<Item>): Model<Item> => {
    const pendingChange = ((): PendingChange => {
      switch (event._tag) {
        case 'NoChange':
          return model.pendingChange
        case 'ElementModifyOnTop':
        case 'ForceManipulateScrollPos':
          return { _tag: 'KeepPosition', before: snapshotBefore(refs, model) }
        case 'ElementModifyOnBottom':
        case 'ElementModifyInPlace':
          return model.pendingChange._tag === 'KeepPosition'
            ? model.pendingChange
            : { _tag: 'RecordPosition' }
      }
    })()
    return pendingChange === model.pendingChange
      ? model
      : { ...model, pendingChange }
  }

// The view drew `applied`: clear it, unless a newer change came since.
export const pendingChangeApplied =
  (applied: PendingChange) =>
  <Item>(model: Model<Item>): Model<Item> =>
    PendingChangeEq.equals(model.pendingChange, applied)
      ? { ...model, pendingChange: { _tag: 'None' } }
      : model

// Keep the pending change, for a change that doesn't say where it lands. A
// change on top without a snapshot (the list wasn't mounted) takes one now.
export const keepPendingChange =
  (refs: Refs) =>
  <Item>(model: Model<Item>): Model<Item> =>
    model.pendingChange._tag === 'KeepPosition' &&
    model.pendingChange.before === null
      ? {
          ...model,
          pendingChange: {
            _tag: 'KeepPosition',
            before: snapshotBefore(refs, model),
          },
        }
      : model

// Set the change the view applies on its next render, or keep the pending one
// when `event` isn't given.
export const setOrKeepContainerChangeEvent =
  (refs: Refs, event: ContainerChangeEvent | undefined) =>
  <Item>(model: Model<Item>): Model<Item> =>
    event
      ? setContainerChangeEvent(refs, event)(model)
      : keepPendingChange(refs)(model)
