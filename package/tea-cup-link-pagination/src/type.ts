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
import { NullableEq, UndefinableEq } from '@rinn7e/tea-cup-prelude'
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import {
  type HttpErrorString,
  HttpErrorStringEq,
} from '@rinn7e/tea-cup-prelude/type/http-error'
import {
  type Size,
  SizeEq,
  defaultPageSize,
  size,
} from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { type SortedUniqueArray } from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import type * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import { type IO } from 'fp-ts/lib/IO'
import { type Option } from 'fp-ts/lib/Option'
import type * as OrdClass from 'fp-ts/lib/Ord'
import * as TE from 'fp-ts/lib/TaskEither'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { type Cmd, type Sub } from 'tea-cup-fp'

// Type
// ----------------------------------------------

// Mutable variables
export type Refs = {
  // container ref
  containerRef: { current: HTMLDivElement | null }
  itemRefs: { current: { [Key: string]: HTMLDivElement | null } }
}

export const mkRefs = (): Refs => ({
  containerRef: { current: null },
  itemRefs: { current: {} },
})

export type CacheHandler<Item> = (
  networkStatus: boolean,
) => Promise<CacheData.Type<Item[]>>

// Endpoint type for next or prev handler
// - cacheData is needed to delete stale cache
export type EndpointHandler<Item> = (
  networkStatus: boolean,
  cacheData: Item[],
  // TODO: use dataF (currentOverall: Item[]) => Item[] for EndpointHandler as well
) => TE.TaskEither<HttpErrorString, Item[]>

export type InitialEndpointResponse<Item> = {
  dataF: (currentOverall: Item[]) => Item[]
  nextIsMax: boolean
  selectedKey?: string | null
}

// Endpoint type for initial handler
// - cacheData is needed to delete stale cache
// - calculate `nextIsMax` by:
//   - if no `selectedData` then, we know `nextIsMax === true`
//   - if the next data is less than the `pageSize`, then we know there is no more next data
export type InitialEndpointHandler<Item> = (
  networkStatus: boolean,
  cacheData: Item[],
) => TE.TaskEither<HttpErrorString, InitialEndpointResponse<Item>>

export type ContainerChangeEvent =
  | { _tag: 'ElementModifyOnTop' } // When we want to maintain the scroll pos, knowing the new dom is added/removed on top.
  | { _tag: 'ElementModifyOnBottom' } // Same as above but the new dom is added/removed on the bottom instead.
  | { _tag: 'ElementModifyInPlace' }
  // We know the container change, but we don't know if it count as
  // element on top or bottom (i.e set current data in link mode)
  | { _tag: 'ForceManipulateScrollPos' }
  | { _tag: 'NoChange' }

export type InitialHandler<Item> = () => {
  cache: CacheHandler<Item>
  endpoint: InitialEndpointHandler<Item>
}

// The loading state of the first page. Its items are in `overallData`.
export type Initial =
  // Not asked for yet (a model made before `init`)
  | { _tag: 'NotStarted' }
  | { _tag: 'Loading' }
  // The cached rows are shown, and the API is still deciding: its answer
  // replaces them. The ends don't load yet, from rows about to be replaced.
  | { _tag: 'Cached' }
  | { _tag: 'Failed'; error: HttpErrorString }
  // The API answered (or failed with the cached rows shown)
  | { _tag: 'Loaded' }

export const InitialEq: EqClass.Eq<Initial> = {
  equals: (a, b) => {
    if (a._tag === 'Failed' && b._tag === 'Failed') {
      return HttpErrorStringEq.equals(a.error, b.error)
    } else {
      return a._tag === b._tag
    }
  },
}

// The loading state of one end of the list (older or newer items).
export type Edge =
  // Can load more
  | { _tag: 'Idle' }
  | { _tag: 'Loading' }
  // The last load failed; a load can retry it
  | { _tag: 'Failed'; error: HttpErrorString }
  // Nothing more on this end
  | { _tag: 'Exhausted' }

export const EdgeEq: EqClass.Eq<Edge> = {
  equals: (a, b) => {
    if (a._tag === 'Failed' && b._tag === 'Failed') {
      return HttpErrorStringEq.equals(a.error, b.error)
    } else {
      return a._tag === b._tag
    }
  },
}

export type Mode<Item> = {
  // A unique key used to identify the data source of the component.
  // Mainly used as debugging at the moment.
  dataSourceId: string

  prevHandler: (overallData: Item[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<Item[]>>
    endpoint: EndpointHandler<Item>
  }
  overallData: SortedUniqueArray<Item>
  prev: Edge
  prevSize: Size

  initialHandler: InitialHandler<Item>
  initial: Initial

  // Identify current selected item using uniqueKeyField
  // Scroll to this value on initial load
  selectedKey: string | null

  nextHandler: (overallData: Item[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<Item[]>>
    endpoint: EndpointHandler<Item>
  }
  next: Edge
  nextSize: Size
}

export function mkModeEq<Item>(itemEq: EqClass.Eq<Item>) {
  return EqClass.struct<Mode<Item>>({
    dataSourceId: S.Eq,
    prevHandler: { equals: () => true },
    overallData: SUA.getEq(itemEq),
    prev: EdgeEq,
    prevSize: SizeEq,
    initialHandler: { equals: () => true },
    initial: InitialEq,
    selectedKey: NullableEq(S.Eq),
    nextHandler: { equals: () => true },
    next: EdgeEq,
    nextSize: SizeEq,
  })
}

export function defaultMode<Item>(): Mode<Item> {
  return {
    dataSourceId: '',
    prevHandler: () => () => {
      return {
        cache: async () => CacheData.fromRD(RD.initial),
        endpoint: () => TE.right([]),
      }
    },
    overallData: SUA.empty(),
    prev: { _tag: 'Idle' },
    prevSize: size(defaultPageSize),
    // isScrollToCurrentDone: false,

    initialHandler: () => ({
      cache: async () => CacheData.fromRD(RD.initial),
      endpoint: () => TE.right({ dataF: () => [], nextIsMax: true }),
    }),
    initial: { _tag: 'NotStarted' },
    selectedKey: null,

    nextHandler: () => () => {
      return {
        cache: async () => CacheData.fromRD(RD.initial),
        endpoint: () => TE.right([]),
      }
    },
    next: { _tag: 'Idle' },
    nextSize: size(defaultPageSize),
  }
}

/**
 * How the data is focus when in link mode
 * `FullInView` - Only count as visible if the whole data is in view
 * `HalfInView` - Count as visible even if the data is half in view
 */
export type VisibleStrategy = { _tag: 'FullInView' } | { _tag: 'HalfInView' }

export const VisibleStrategyEq = EqClass.struct<VisibleStrategy>({
  _tag: S.Eq,
})

export type CustomUiParam<Item, Parent> = {
  withPrevNextItem: WithPrevAndNext<Item>
  parent: Parent
  selectedItem: Option<Item>
  dataSourceId: string
  allItems: Item[]
}

export const defaultDataSourceIdAttribute = 'data-link-pagin-datasource-id'

export type LogicConfig<Item, Parent, ItemMsg> = {
  refs: Refs
  dataSourceIdAttribute?: string

  isReversed: boolean
  ord: OrdClass.Ord<Item>
  // The item's identity. Items with the same key are the same item
  // (`keyEq` in `util.ts`).
  uniqueKeyField: (item: Item) => string
  visibleStrategy: VisibleStrategy

  update: (
    parent: Parent,
    msg: ItemMsg,
    model: Item,
  ) => [Item, Cmd<ItemMsg>, ContainerChangeEvent]
  // The item's own subscriptions (e.g. its drawer). Their messages reach the
  // item through `ChildMsg`, like the ones `update` handles.
  subscriptions: (model: Item) => Sub<ItemMsg>
}

export type WithPrevAndNext<Item> = {
  nextItem: Item | null
  item: Item
  prevItem: Item | null
}

export type UiConfig<Item, Parent> = {
  // A function on how to render an item
  customItemUi: (param: CustomUiParam<Item, Parent>) => JSX.Element
  // A function on how to render all items together (doesn't include prev or next loading)
  // Only use where grouping items together in a block is a must-have (sticky date, using `position: sticky`)
  customAllItemUi?: (
    allItems: WithPrevAndNext<Item>[],
    allItemUi: (data: WithPrevAndNext<Item>[]) => JSX.Element[],
    configIsReversed: boolean,
  ) => JSX.Element[]
  customAllItemEffect?: (
    containerRef: React.RefObject<HTMLDivElement | null>,
    timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
    isScrolling: boolean,
  ) => void

  scrollbarClass: string

  // Disable link pagin scrollbar, this meant for the parent container to handle scrolling instead
  disableScrolling: boolean
  titleView: (() => JSX.Element) | null
  scrollToLatestCustomUi:
    | ((props: {
        parent: Parent
        onClick: () => void
        isVisible: boolean
      }) => JSX.Element)
    | null
  loadingView: (() => JSX.Element) | null
  prevLoadingIndicatorView?: () => JSX.Element | null
  nextLoadingIndicatorView?: () => JSX.Element | null
  prevIsMaxCustomView?: (parent: Parent) => JSX.Element | null
  nextIsMaxCustomView?: (parent: Parent) => JSX.Element | null
  // Shown when loading an end failed; `retry` loads it again
  prevFailedCustomView?: (parent: Parent, retry: () => void) => JSX.Element
  nextFailedCustomView?: (parent: Parent, retry: () => void) => JSX.Element
}

export type Config<Item, Parent, ItemMsg> = {
  logic: LogicConfig<Item, Parent, ItemMsg>
  ui: UiConfig<Item, Parent>
}

export function mkLogicConfigEq<Item, Parent, ItemMsg>(
  _itemEq: EqClass.Eq<Item>,
) {
  return EqClass.struct<LogicConfig<Item, Parent, ItemMsg>>({
    refs: { equals: () => true },
    dataSourceIdAttribute: UndefinableEq(S.Eq),
    isReversed: B.Eq,
    ord: { equals: () => true },
    uniqueKeyField: { equals: () => true },
    visibleStrategy: VisibleStrategyEq,

    update: { equals: () => true },
    subscriptions: { equals: () => true },
  })
}

export function mkUiConfigEq<Item, Parent>(_eqA: EqClass.Eq<Item>) {
  return EqClass.struct<UiConfig<Item, Parent>>({
    customItemUi: { equals: () => true },
    customAllItemUi: { equals: () => true },
    customAllItemEffect: { equals: () => true },
    scrollbarClass: S.Eq,
    disableScrolling: B.Eq,
    titleView: NullableEq({ equals: () => true }),
    scrollToLatestCustomUi: NullableEq({ equals: () => true }),
    loadingView: NullableEq({ equals: () => true }),
    prevLoadingIndicatorView: { equals: () => true },
    nextLoadingIndicatorView: { equals: () => true },
    prevIsMaxCustomView: { equals: () => true },
    nextIsMaxCustomView: { equals: () => true },
    prevFailedCustomView: { equals: () => true },
    nextFailedCustomView: { equals: () => true },
  })
}

export function mkConfigEq<Item, Parent, ItemMsg>(itemEq: EqClass.Eq<Item>) {
  return EqClass.struct<Config<Item, Parent, ItemMsg>>({
    logic: mkLogicConfigEq(itemEq),
    ui: mkUiConfigEq(itemEq),
  })
}

export type ShouldRestoreScrollStateArg = {
  /**
   * This function can be called to check if we should restore the scroll model
   *
   * - `ScrollState` if we should restore the scroll model
   * - `TargetKey` if we should scroll to a specific key (e.g. oldest unseen item)
   * - `NoOp` if we don't restore the scroll model
   */
  checkShouldRestore: () =>
    | { _tag: 'NoOp' }
    | { _tag: 'ScrollState' }
    | { _tag: 'TargetKey'; key: string }
  restore: (dataSourceId: string, container: HTMLDivElement) => IO<void>
}

// The container's scroll position and height.
export type ScrollSnapshot = { scrollTop: number; scrollHeight: number }

export const ScrollSnapshotEq = EqClass.struct<ScrollSnapshot>({
  scrollTop: EqClass.eqNumber,
  scrollHeight: EqClass.eqNumber,
})

// The last change to the rows that the view still has to apply. Callers say
// where their change lands (`ContainerChangeEvent`, through
// `setContainerChangeEvent`); this is what the view does with it.
export type PendingChange =
  | { _tag: 'None' }
  // A change on top (`ElementModifyOnTop`, `ForceManipulateScrollPos`): the
  // view keeps the scroll position, measured against `before`, the container
  // as it was right before the change was rendered. It is taken by `update`
  // while the old rows are still on screen (`null` when the list wasn't
  // mounted).
  | { _tag: 'KeepPosition'; before: ScrollSnapshot | null }
  // A change below or in place (`ElementModifyOnBottom`,
  // `ElementModifyInPlace`): the view only records the new position.
  | { _tag: 'RecordPosition' }

export const PendingChangeEq: EqClass.Eq<PendingChange> = {
  equals: (a, b) => {
    if (a._tag === 'KeepPosition' && b._tag === 'KeepPosition') {
      return NullableEq(ScrollSnapshotEq).equals(a.before, b.before)
    } else {
      return a._tag === b._tag
    }
  },
}

export type Model<Item> = {
  mode: Mode<Item>

  pendingChange: PendingChange

  // scroll model handlers
  onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => IO<void>
  shouldRestoreScrollState?: ShouldRestoreScrollStateArg

  // Turn the ui invisible while scrolling msg is going on
  // Useful on initial load of link mode.
  invisWhileScrolling: boolean
  isScrolling: boolean
  /**
   * Tracks the one-time initial scroll for the current mount.
   *
   * Reset to `Pending` only when a list is (re-)mounted, via `GetInitialData`
   * / `init()`. It is left untouched by `RefreshInitialData` so that an
   * in-place refresh of an already-mounted list never re-triggers a scroll.
   */
  initialScroll: InitialScroll
}

export type InitialScroll =
  // Not scrolled yet: the next load that resolves the target scrolls.
  | { _tag: 'Pending' }
  // Scrolled to the target `key` among the cached rows. The API load may
  // still move the target or change the rows around it.
  | { _tag: 'FromCache'; key: string }
  // Scrolled for good.
  | { _tag: 'Done' }

export const InitialScrollEq: EqClass.Eq<InitialScroll> = {
  equals: (a, b) =>
    a._tag === 'FromCache' && b._tag === 'FromCache'
      ? a.key === b.key
      : a._tag === b._tag,
}

export function ModelEq<Item>(itemEq: EqClass.Eq<Item>) {
  return EqClass.struct<Model<Item>>({
    mode: mkModeEq(itemEq),
    pendingChange: PendingChangeEq,
    onContainerScroll: { equals: () => true },
    shouldRestoreScrollState: { equals: () => true },

    invisWhileScrolling: B.Eq,
    isScrolling: B.Eq,
    initialScroll: InitialScrollEq,
  })
}

export type ScrollToCurrentParam = {
  isGraceful: boolean
  // ^ whether or not 'ScrollToCurrent' is trigger by initial api load
  // or graceful switch (no api load)
}

// -------------------------------------------
// Prop
// -------------------------------------------

export type Props<Item, Parent, ParentMsg, ItemMsg, Route> = {
  itemEq: EqClass.Eq<Item>
  parentEq: EqClass.Eq<Parent>
  config: Config<Item, Parent, ItemMsg>
  parent: Parent // props from parent to be passed into customUI

  dispatchParent: (p: ParentMsg) => void
  mkParentMsg: (msg: Msg<Item, ItemMsg, Route>) => ParentMsg
  model: Model<Item>
}

export function PropsEq<Item, Parent, ParentMsg, ItemMsg, Route>(
  itemEq: EqClass.Eq<Item>,
  parentEq: EqClass.Eq<Parent>,
) {
  return EqClass.struct<Props<Item, Parent, ParentMsg, ItemMsg, Route>>({
    itemEq: { equals: () => true },
    parentEq: { equals: () => true },
    config: mkConfigEq(itemEq),
    parent: parentEq,

    dispatchParent: { equals: () => true },
    mkParentMsg: { equals: () => true },
    model: ModelEq(itemEq),
  })
}

// -------------------------------------------
// Msg
// -------------------------------------------

export type Msg<Item, ItemMsg, Route> =
  // --------------------------------------------
  // General
  | { _tag: 'NoOp' }
  | {
      _tag: 'SetState'
      value: Model<Item>
      routeUpdater?: AppRouteUpdater<Route>
      // Where the change lands; without it, the pending change is kept
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      _tag: 'SetModeAndAddUpdateData'
      mode: Mode<Item>
      data: Item | null // new data to be added right after changing the mode (mainly used by SSE)
      shouldReload?: true
      onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => IO<void>
      shouldRestoreScrollState?: ShouldRestoreScrollStateArg
    }
  | {
      // Given a function, map it to each data (depends on mode)
      _tag: 'MapFunc'
      func: (item: Item) => Item
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      // Given a function, run it against all the data
      _tag: 'ReplaceFunc'
      func: (
        items: SortedUniqueArray<Item>,
      ) => [SortedUniqueArray<Item>, AppRouteUpdater<Route>]
      containerChangeEvent?: ContainerChangeEvent
    }
  | { _tag: 'SetContainerChangeEvent'; value: ContainerChangeEvent }
  | {
      _tag: 'ScrollToNewest'
    }
  // TODO: Make this more generic
  | {
      _tag: 'ForceScrollTo'
      top: number
    }
  | {
      _tag: 'ScrollToKey'
      key: string
    }
  // TODO: Disabled for now since we disable prefetching
  //  | {
  //   _tag: 'PopulateFirstResponse'
  //   result: E.Either<string, Item[]>
  //   invokeTime: Date
  // }
  // TODO: broken, and nothing sends it. `replaceFuncAsyncCmd` runs `func` on
  // the items of the model as it was when this message arrived, then sends
  // `SetState` with a whole model built from that old one. So everything that
  // changed while the promise ran is lost: pages loaded meanwhile, the ends'
  // and first page's states, items updated by SSE, `initialScroll`, the
  // scrolling flags (only `pendingChange` is taken from the current model). Do
  // the async work in the owner's Cmd and send `ReplaceFunc` with the result
  // instead, which runs on the current items, or fix this to apply its result
  // to the current model.
  | {
      _tag: 'ReplaceFuncAsync'
      // TODO: setGlobalMsg is a hack to be able to call navigate in this function
      // When link pagin become tea-cup component, we can remove this hack
      func: (
        items: SortedUniqueArray<Item>,
      ) => Promise<[SortedUniqueArray<Item>, AppRouteUpdater<Route>]>
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      _tag: 'SetIsScrolling'
      value: boolean
    }
  // Triggered when the prev/next trigger buttons enter the viewport or are clicked
  | { _tag: 'GetMorePrevData' }
  | {
      _tag: 'GetMorePrevDataFromCacheResponse'
      dataSourceId: string
      endpoint: EndpointHandler<Item>
      cache: RD.RemoteData<HttpErrorString, Item[]>
    }
  | {
      _tag: 'GetMorePrevDataFromApiResponse'
      dataSourceId: string
      overallDataBeforeCache: Item[]
      result: E.Either<HttpErrorString, Item[]>
    }
  | { _tag: 'GetMoreNextData' }
  | {
      _tag: 'GetMoreNextDataFromCacheResponse'
      dataSourceId: string
      endpoint: EndpointHandler<Item>
      cache: RD.RemoteData<HttpErrorString, Item[]>
    }
  | {
      _tag: 'GetMoreNextDataFromApiResponse'
      dataSourceId: string
      overallDataBeforeCache: Item[]
      result: E.Either<HttpErrorString, Item[]>
    }
  // --------------------------------------------
  // Datasource specific
  | {
      // Find and update existing data. If it does not exist, add the data.
      _tag: 'AddOrUpdateData'
      dataSourceId: string
      value: { data: Item; previousId: string | null }[]
      compareId: (item: Item, id: string) => boolean
    }
  | {
      _tag: 'AddToPrevOverallData'
      dataSourceId: string
      value: Item[]
    }
  | {
      _tag: 'AddToNextOverallData'
      dataSourceId: string
      value: Item[]
    }
  | {
      _tag: 'SetNewSelectedKey'
      dataSourceId: string
      selectedKey: string | null
      triggerScrollToCurrent?: ScrollToCurrentParam
      shouldReload?: true
    }
  | {
      /**
       * Loads the initial page of data for a newly mounted list. Dispatched
       * internally by `init()`. Resets the one-time scroll obligation and
       * shows a loading state until the data arrives.
       *
       * Do not dispatch this for a list that is already mounted and visible
       * — use `RefreshInitialData` instead.
       */
      _tag: 'GetInitialData'
    }
  | {
      /**
       * Re-fetches the initial page of data for a list that is already
       * mounted and visible, without disturbing what is currently
       * displayed or re-triggering the one-time initial scroll. Intended
       * for silently refreshing an open list, e.g. in response to a
       * real-time update.
       */
      _tag: 'RefreshInitialData'
    }
  | {
      _tag: 'GetInitialDataFromCacheResponse'
      dataSourceId: string
      cache: RD.RemoteData<HttpErrorString, Item[]>
    }
  | {
      _tag: 'GetInitialDataFromApiResponse'
      dataSourceId: string
      result: E.Either<HttpErrorString, InitialEndpointResponse<Item>>
    }
  | {
      _tag: 'ScrollToCurrentDone'
      dataSourceId: string
      param: ScrollToCurrentParam
    }
  | {
      _tag: 'SetInvisWhileScrolling'
      dataSourceId: string
      value: boolean
    }
  | {
      _tag: 'ChildMsg'
      childId: string
      subMsg: ItemMsg
    }

// Stable IDs for the prev/next InView trigger buttons, derived from the data source.
export const prevButtonId = (dataSourceId: string): string =>
  `link-pagin-prev-btn-${dataSourceId}`
export const nextButtonId = (dataSourceId: string): string =>
  `link-pagin-next-btn-${dataSourceId}`
