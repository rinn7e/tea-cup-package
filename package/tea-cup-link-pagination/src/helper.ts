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
import { cmdFromPromise } from '@rinn7e/tea-cup-prelude'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import { type Size } from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { type SortedUniqueArray } from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as A from 'fp-ts/lib/Array'
import { type IORef } from 'fp-ts/lib/IORef'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as RM from 'fp-ts/lib/ReadonlyMap'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'
import { Cmd } from 'tea-cup-fp'

import {
  type ScrollStateMap,
  restoreScrollState,
} from './common/type/scroll-state-map'
import { scrollToNewestHandler } from './handler'
import {
  type ContainerChangeEvent,
  type InitialHandler,
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
} from './type'
import { keyEq, reopenEdge, setOrKeepContainerChangeEvent } from './util'

// -------------------------------------------
// Reading items
// -------------------------------------------

// Every loaded item, in `ord` order.
export const items = <Item>(model: Model<Item>): Item[] =>
  model.mode.overallData.value

export const findByKey =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    key: string,
  ) =>
  (model: Model<Item>): Option<Item> =>
    pipe(
      items(model),
      A.findFirst((item) => config.uniqueKeyField(item) === key),
    )

export const findBy =
  <Item>(predicate: (item: Item) => boolean) =>
  (model: Model<Item>): Option<Item> =>
    pipe(items(model), A.findFirst(predicate))

export const hasKey =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    key: string,
  ) =>
  (model: Model<Item>): boolean =>
    O.isSome(findByKey(config, key)(model))

// The first and the last item in `ord` order.
export const first = <Item>(model: Model<Item>): Option<Item> =>
  A.head(items(model))

export const last = <Item>(model: Model<Item>): Option<Item> =>
  A.last(items(model))

export const isEmpty = <Item>(model: Model<Item>): boolean =>
  items(model).length === 0

// The first page is loaded: the API answered (the ends can load).
export const isInitialLoaded = <Item>(model: Model<Item>): boolean =>
  model.mode.initial._tag === 'Loaded'

// The first page's rows are shown, from the cache or the API.
export const isInitialShown = <Item>(model: Model<Item>): boolean =>
  model.mode.initial._tag === 'Cached' || model.mode.initial._tag === 'Loaded'

// Nothing newer to load: the newest item is loaded.
export const isAtNewest = <Item>(model: Model<Item>): boolean =>
  model.mode.next._tag === 'Exhausted'

// -------------------------------------------
// Changing items
// -------------------------------------------
//
// Each takes the `ContainerChangeEvent` of its change (where it lands). Without
// one, the pending change is kept, as `MapFunc` and `ReplaceFunc` do.

// Run `f` against all the items.
export const modifyItems =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    f: (items: SortedUniqueArray<Item>) => SortedUniqueArray<Item>,
    event?: ContainerChangeEvent,
  ) =>
  (model: Model<Item>): Model<Item> =>
    setOrKeepContainerChangeEvent(
      config.refs,
      event,
    )({
      ...model,
      mode: { ...model.mode, overallData: f(model.mode.overallData) },
    })

export const mapItems = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  f: (item: Item) => Item,
  event?: ContainerChangeEvent,
) => modifyItems(config, SUA.map(keyEq(config), config.ord)(f), event)

export const filterItems = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  predicate: (item: Item) => boolean,
  event?: ContainerChangeEvent,
) => modifyItems(config, SUA.filter(predicate), event)

export const filterMapItems = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  f: (item: Item) => Option<Item>,
  event?: ContainerChangeEvent,
) => modifyItems(config, SUA.filterMap(keyEq(config), config.ord)(f), event)

// Change the items that match `predicate`.
export const updateWhere = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  predicate: (item: Item) => boolean,
  f: (item: Item) => Item,
  event?: ContainerChangeEvent,
) => mapItems(config, (item) => (predicate(item) ? f(item) : item), event)

export const updateByKey = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  key: string,
  f: (item: Item) => Item,
  event?: ContainerChangeEvent,
) =>
  updateWhere(config, (item) => config.uniqueKeyField(item) === key, f, event)

export const removeWhere = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  predicate: (item: Item) => boolean,
  event?: ContainerChangeEvent,
) => filterItems(config, (item) => !predicate(item), event)

export const removeByKey = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  key: string,
  event?: ContainerChangeEvent,
) => removeWhere(config, (item) => config.uniqueKeyField(item) === key, event)

// Add `fresh` items, replacing the loaded item of the same key. `merge`
// builds the replacement from the loaded item and the fresh one (the fresh one
// by default). The loaded item is taken out first: when both sort equal, the
// dedup would keep the one that comes first.
export const upsertInto =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    fresh: Item[],
    merge: (loaded: Item, fresh: Item) => Item = (_loaded, item) => item,
  ) =>
  (all: SortedUniqueArray<Item>): SortedUniqueArray<Item> => {
    const replacements = pipe(
      fresh,
      A.map((item) =>
        pipe(
          all.value,
          A.findFirst(
            (loaded) =>
              config.uniqueKeyField(loaded) === config.uniqueKeyField(item),
          ),
          O.fold(
            () => item,
            (loaded) => merge(loaded, item),
          ),
        ),
      ),
    )
    const freshKeys = new Set(fresh.map(config.uniqueKeyField))
    return pipe(
      all,
      SUA.filter((loaded) => !freshKeys.has(config.uniqueKeyField(loaded))),
      SUA.concat(keyEq(config), config.ord)(replacements),
    )
  }

export const upsertItems = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  fresh: Item[],
  merge?: (loaded: Item, fresh: Item) => Item,
  event?: ContainerChangeEvent,
) => modifyItems(config, upsertInto(config, fresh, merge), event)

// -------------------------------------------
// Item children
// -------------------------------------------

// No change to the rows, for an item's `update`.
export const noChange: ContainerChangeEvent = { _tag: 'NoChange' }

// The list's message carrying `msg` to `item`.
export const childMsg =
  <Item, Parent, ItemMsg>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    item: Item,
  ) =>
  (msg: ItemMsg): { _tag: 'ChildMsg'; childId: string; subMsg: ItemMsg } => ({
    _tag: 'ChildMsg',
    childId: config.uniqueKeyField(item),
    subMsg: msg,
  })

// The item's key and message, if `msg` carries one to an item.
export const getChildMsg = <Item, ItemMsg, Route>(
  msg: Msg<Item, ItemMsg, Route>,
): Option<{ key: string; msg: ItemMsg }> =>
  msg._tag === 'ChildMsg'
    ? O.some({ key: msg.childId, msg: msg.subMsg })
    : O.none

// Run `f` on the item with `key`: it returns the item and the item's Cmd,
// which reaches the item again through `ChildMsg`. Nothing happens while the
// item isn't loaded.
export const updateChild =
  <Item, Parent, ItemMsg, Route>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    key: string,
    f: (item: Item) => [Item, Cmd<ItemMsg>],
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] =>
    pipe(
      findByKey(config, key)(model),
      O.fold(
        () => [model, Cmd.none()],
        (item) => {
          const [newItem, cmd] = f(item)
          return [
            updateByKey(config, key, () => newItem)(model),
            cmd.map(
              (subMsg): Msg<Item, ItemMsg, Route> =>
                childMsg(config, newItem)(subMsg),
            ),
          ]
        },
      ),
    )

// Run `f` on every item, as `updateChild` does on one.
export const updateAllChildren =
  <Item, Parent, ItemMsg, Route>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    f: (item: Item) => [Item, Cmd<ItemMsg>],
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
    const results = pipe(
      items(model),
      A.map((item) => {
        const [newItem, cmd] = f(item)
        return {
          item: newItem,
          cmd: cmd.map(
            (subMsg): Msg<Item, ItemMsg, Route> =>
              childMsg(config, item)(subMsg),
          ),
        }
      }),
    )
    const byKey = new Map(
      results.map((r) => [config.uniqueKeyField(r.item), r.item]),
    )
    return [
      mapItems(
        config,
        (item) => byKey.get(config.uniqueKeyField(item)) ?? item,
      )(model),
      Cmd.batch(results.map((r) => r.cmd)),
    ]
  }

// -------------------------------------------
// Scrolling
// -------------------------------------------

// Scroll to the newest item, smoothly.
export const scrollToNewest =
  <Item, Parent, ItemMsg, Route>(config: LogicConfig<Item, Parent, ItemMsg>) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] =>
    scrollToNewestHandler<Item, ItemMsg, Route>(
      config.refs,
      config.isReversed,
      model,
    )

// Put a list shown again (kept by its owner while it was away) back at the
// reading position stored for it, hidden until it's there. `resetEdges`
// reopens exhausted ends, so stale data can load again; a list kept fresh
// by other means keeps them.
export const restoreSavedScroll =
  <Item, Parent, ItemMsg, Route>(
    config: LogicConfig<Item, Parent, ItemMsg>,
    scrollStateRef: IORef<ScrollStateMap>,
    option: { resetEdges: boolean },
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
    // A change the list had pending while it was away has a snapshot of the
    // container as it was then (or of another list's, sharing `refs`):
    // drawing it would move the view away from the stored position.
    const away: Model<Item> = { ...model, pendingChange: { _tag: 'None' } }
    const reset: Model<Item> = option.resetEdges
      ? {
          ...away,
          mode: {
            ...away.mode,
            prev: reopenEdge(away.mode.prev),
            next: reopenEdge(away.mode.next),
          },
        }
      : away
    const dataSourceId = model.mode.dataSourceId
    if (RM.member(S.Eq)(dataSourceId)(scrollStateRef.read())) {
      return [
        { ...reset, visibility: { _tag: 'HiddenForRestore' } },
        cmdFromPromise(
          async () => {
            // After the list is rendered again
            await new Promise((resolve) => requestAnimationFrame(resolve))
            const container = config.refs.containerRef.current
            if (container) {
              restoreScrollState(scrollStateRef)(dataSourceId, container)()
            }
          },
          (): Msg<Item, ItemMsg, Route> => ({
            _tag: 'RestoreDone',
            dataSourceId,
          }),
        ),
      ]
    } else {
      return [reset, Cmd.none()]
    }
  }

// Make `key` the selected item.
export const setSelectedKey =
  (key: string | null) =>
  <Item>(model: Model<Item>): Model<Item> => ({
    ...model,
    mode: { ...model.mode, selectedKey: key },
  })

// A model for `mode` before `init` loads it (nothing asked for yet).
export const emptyModel = <Item>(mode: Mode<Item>): Model<Item> => ({
  mode,
  pendingChange: { _tag: 'None' },
  visibility: { _tag: 'Visible' },
  isScrolling: false,
  initialScroll: { _tag: 'Pending' },
})

// -------------------------------------------
// Data sources
// -------------------------------------------

// A cache read, with its response turned into the list's items.
export const mkCacheHandler =
  <Response, Item>(
    read: () => Promise<CacheData.Type<Response>>,
    toItems: (response: Response) => Item[],
  ) =>
  async (): Promise<CacheData.Type<Item[]>> =>
    pipe(await read(), CacheData.map(toItems))

// An end that has nothing to load.
export const noopHandler =
  <Item>(): Mode<Item>['nextHandler'] =>
  () =>
  () => ({
    cache: async () => CacheData.fromRD(RD.success([])),
    endpoint: () => TE.right([]),
  })

// A first page loaded as the older end's first page, for a list that always
// opens at its newest item (nothing newer to load).
export const initialFromPrev =
  <Item>(
    prevHandler: Mode<Item>['prevHandler'],
    size: Size,
  ): InitialHandler<Item> =>
  () => {
    const { cache, endpoint } = prevHandler([])(size)
    return {
      cache,
      endpoint: (networkStatus, cacheData) =>
        pipe(
          endpoint(networkStatus, cacheData),
          TE.map((items) => ({ dataF: () => items, nextIsMax: true })),
        ),
    }
  }
