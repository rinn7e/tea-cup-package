// SPDX-FileCopyrightText: 2023 Rinn7e <https://rinn7e.io>
//
// SPDX-License-Identifier: MIT
import * as RD from '@devexperts/remote-data-ts'
import { NullableEq } from '@rinn7e/tea-cup-prelude'
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
import * as A from 'fp-ts/lib/Array'
import type * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import { type Option } from 'fp-ts/lib/Option'
import type * as OrdClass from 'fp-ts/lib/Ord'
import * as TE from 'fp-ts/lib/TaskEither'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { type Cmd } from 'tea-cup-fp'

// Constant
// ----------------------------------------------

export const dataSourceIdAttribute = 'data-datasource-id'

// Type
// ----------------------------------------------

// Mutable variables
export type Refs = {
  // Use ref since this get updated on every scroll and we don't we want to re-render
  // `currentScrollPos` is not used for rendering anyway, but mainly for
  // saving scroll model when adding new data.
  currentScrollPosRef: { current: number }
  currentScrollHeightRef: { current: number }
  // container ref
  containerRef: { current: HTMLDivElement | null }
  itemRefs: { current: { [Key: string]: HTMLDivElement | null } }
}

export const mkRefs = (): Refs => ({
  currentScrollPosRef: { current: 0 },
  currentScrollHeightRef: { current: 0 },
  containerRef: { current: null },
  itemRefs: { current: {} },
})

export type CacheHandler<A> = (
  networkStatus: boolean,
) => Promise<CacheData.Type<A[]>>

// Endpoint type for next or prev handler
// - cacheData is needed to delete stale cache
export type EndpointHandler<A> = (
  networkStatus: boolean,
  cacheData: A[],
  // TODO: use dataF (currentOverall: A[]) => A[] for EndpointHandler as well
) => TE.TaskEither<HttpErrorString, A[]>

export type InitialEndpointResponse<A> = {
  dataF: (currentOverall: A[]) => A[]
  nextIsMax: boolean
}

// Endpoint type for initial handler
// - cacheData is needed to delete stale cache
// - calculate `nextIsMax` by:
//   - if no `selectedData` then, we know `nextIsMax === true`
//   - if the next data is less than the `pageSize`, then we know there is no more next data
export type InitialEndpointHandler<A> = (
  networkStatus: boolean,
  cacheData: A[],
) => TE.TaskEither<HttpErrorString, InitialEndpointResponse<A>>

export type ContainerChangeEvent =
  | { _tag: 'ElementModifyOnTop' } // When we want to maintain the scroll pos, knowing the new dom is added/removed on top.
  | { _tag: 'ElementModifyOnBottom' } // Same as above but the new dom is added/removed on the bottom instead.
  | { _tag: 'ElementModifyInPlace' }
  // We know the container change, but we don't know if it count as
  // element on top or bottom (i.e set current data in link mode)
  | { _tag: 'ForceManipulateScrollPos' }
  | { _tag: 'NoChange' }

export type InitialHandler<A> = () => {
  cache: CacheHandler<A>
  endpoint: InitialEndpointHandler<A>
}

export type Mode<A> = {
  // A unique key used to identify the data source of the component.
  // Mainly used as debugging at the moment.
  dataSourceId: string

  prevHandler: (overallData: A[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<A[]>>
    endpoint: EndpointHandler<A>
  }
  overallData: SortedUniqueArray<A>
  prevData: RD.RemoteData<HttpErrorString, A[]>
  prevSize: Size
  prevIsMax: boolean
  // When true, on load more prev, it will call the same index instead of increasing
  // the index.
  allowRetryPrev: boolean

  initialHandler: InitialHandler<A>
  initialData: RD.RemoteData<HttpErrorString, A[]>

  // Identify current selected A using uniqueKeyField
  // Scroll to this value on initial load
  selectedKey: string | null

  nextHandler: (overallData: A[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<A[]>>
    endpoint: EndpointHandler<A>
  }
  nextData: RD.RemoteData<HttpErrorString, A[]>
  nextSize: Size
  nextIsMax: boolean

  // Current data's animation related
  // In some use case of link pagin (message list), we play animation
  // for current data in link mode. These fields track those info.

  // 'done' signify that current data's animation can be play.
  // We have this delay to let the scrolling finish first
  retriggerCurrentData: 'start' | 'done'

  // We track animation end to avoid replaying it on component re-render
  animationEnd: boolean
}

export function mkModeEq<A>(aEq: EqClass.Eq<A>) {
  return EqClass.struct<Mode<A>>({
    dataSourceId: S.Eq,
    prevHandler: { equals: () => true },
    overallData: SUA.getEq(aEq),
    prevData: RD.getEq(HttpErrorStringEq, A.getEq(aEq)),
    prevSize: SizeEq,
    prevIsMax: B.Eq,
    allowRetryPrev: B.Eq,
    initialHandler: { equals: () => true },
    initialData: RD.getEq(HttpErrorStringEq, A.getEq(aEq)),
    selectedKey: NullableEq(S.Eq),
    nextHandler: { equals: () => true },
    nextData: RD.getEq(HttpErrorStringEq, A.getEq(aEq)),
    nextSize: SizeEq,
    nextIsMax: B.Eq,
    retriggerCurrentData: S.Eq,
    animationEnd: B.Eq,
  })
}

export function defaultMode<A>(): Mode<A> {
  return {
    dataSourceId: '',
    prevHandler: () => () => {
      return {
        cache: async () => CacheData.fromRD(RD.initial),
        endpoint: () => TE.right([]),
      }
    },
    overallData: SUA.empty(),
    prevData: RD.initial,
    prevSize: size(defaultPageSize),
    prevIsMax: false,
    // isScrollToCurrentDone: false,
    allowRetryPrev: false,

    initialHandler: () => ({
      cache: async () => CacheData.fromRD(RD.initial),
      endpoint: () => TE.right({ dataF: () => [], nextIsMax: true }),
    }),
    initialData: RD.initial,
    selectedKey: null,
    retriggerCurrentData: 'done',
    animationEnd: false,

    nextHandler: () => () => {
      return {
        cache: async () => CacheData.fromRD(RD.initial),
        endpoint: () => TE.right([]),
      }
    },
    nextData: RD.initial,
    nextSize: size(defaultPageSize),
    nextIsMax: false,
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

export type CustomUiParam<A, B> = {
  withPrevNextA: WithPrevAndNext<A>
  b: B
  selectedA: Option<A>
  retriggerCurrentData: 'start' | 'done'
  animationEnd: boolean
  dataSourceId: string
  allA: A[]
}

export type LogicConfig<A, B, amsg> = {
  refs: Refs
  mode: Mode<A>

  isReversed: boolean
  // eq instance that compare key only (should be the same as `uniqueKeyField`)
  // TODO: probably derived this from `uniqueKeyField`, instead of passing it twice
  eqWithKey: EqClass.Eq<A>
  ord: OrdClass.Ord<A>
  uniqueKeyField: (a: A) => string
  visibleStrategy: VisibleStrategy

  update: (
    parentSt: B,
    msg: amsg,
    model: A,
  ) => [A, Cmd<amsg>, ContainerChangeEvent]
}

export type WithPrevAndNext<A> = { nextA: A | null; a: A; prevA: A | null }

export type UiConfig<A, B> = {
  // A function on how to render an item
  customItemUi: (param: CustomUiParam<A, B>) => JSX.Element
  // A function on how to render all items together (doesn't include prev or next loading)
  // Only use where grouping items together in a block is a must-have (sticky date, using `position: sticky`)
  customAllItemUi?: (
    allA: WithPrevAndNext<A>[],
    allItemUi: (data: WithPrevAndNext<A>[]) => JSX.Element[],
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
        parentSt: B
        onClick: () => void
        isVisible: boolean
      }) => JSX.Element)
    | null
  loadingView: (() => JSX.Element) | null
  prevLoadingIndicatorView?: () => JSX.Element | null
  nextLoadingIndicatorView?: () => JSX.Element | null
  prevIsMaxCustomView?: (b: B) => JSX.Element | null
  nextIsMaxCustomView?: (b: B) => JSX.Element | null
}

export type Config<A, B, amsg> = {
  logic: LogicConfig<A, B, amsg>
  ui: UiConfig<A, B>
}

export function mkLogicConfigEq<A, B, amsg>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<LogicConfig<A, B, amsg>>({
    refs: { equals: () => true },
    mode: mkModeEq(eqA),
    isReversed: B.Eq,
    eqWithKey: { equals: () => true },
    ord: { equals: () => true },
    uniqueKeyField: { equals: () => true },
    visibleStrategy: VisibleStrategyEq,

    update: { equals: () => true },
  })
}

export function mkUiConfigEq<A, B>(_eqA: EqClass.Eq<A>) {
  return EqClass.struct<UiConfig<A, B>>({
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
  })
}

export function mkConfigEq<A, B, amsg>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<Config<A, B, amsg>>({
    logic: mkLogicConfigEq(eqA),
    ui: mkUiConfigEq(eqA),
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
  restore: (dataSourceId: string, container: HTMLDivElement) => void
}

export type Model<A> = {
  mode: Mode<A>

  containerChangeEvent: ContainerChangeEvent

  // scroll model handlers
  onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => void
  shouldRestoreScrollState?: ShouldRestoreScrollStateArg

  // Turn the ui invisible while scrolling msg is going on
  // Useful on initial load of link mode.
  invisWhileScrolling: boolean
  isScrolling: boolean
  savedScrollPos: number | null
}

export function ModelEq<A>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<Model<A>>({
    mode: mkModeEq(eqA),
    containerChangeEvent: EqClass.struct({ _tag: S.Eq }),
    onContainerScroll: { equals: () => true },
    shouldRestoreScrollState: { equals: () => true },

    invisWhileScrolling: B.Eq,
    isScrolling: B.Eq,
    savedScrollPos: NullableEq(EqClass.eqNumber),
  })
}

export type ScrollToCurrentParam = {
  isGraceful: boolean
  // ^ whether or not 'ScrollToCurrent' is trigger by initial api load
  // or graceful switch (no api load)
  isSearching?: boolean
}

// -------------------------------------------
// Prop
// -------------------------------------------

export type Props<A, B, pmsg, amsg, Route> = {
  aEq: EqClass.Eq<A>
  bEq: EqClass.Eq<B>
  config: Config<A, B, amsg>
  b: B // props from parent to be passed into customUI

  dispatchP: (p: pmsg) => void
  mkPmsg: (msg: Msg<A, amsg, Route>) => pmsg
  model: Model<A>
}

export function PropsEq<A, B, pmsg, amsg, Route>(
  eqA: EqClass.Eq<A>,
  eqB: EqClass.Eq<B>,
) {
  return EqClass.struct<Props<A, B, pmsg, amsg, Route>>({
    aEq: { equals: () => true },
    bEq: { equals: () => true },
    config: mkConfigEq(eqA),
    b: eqB,

    dispatchP: { equals: () => true },
    mkPmsg: { equals: () => true },
    model: ModelEq(eqA),
  })
}

// -------------------------------------------
// Msg
// -------------------------------------------

export type Msg<A, amsg, Route> =
  // --------------------------------------------
  // General
  | { _tag: 'NoOp' }
  | { _tag: 'SetState'; value: Model<A>; routeUpdater?: AppRouteUpdater<Route> }
  | {
      _tag: 'SetModeAndAddUpdateData'
      mode: Mode<A>
      data: A | null // new data to be added right after changing the mode (mainly used by SSE)
      shouldReload?: true
      onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => void
      shouldRestoreScrollState?: ShouldRestoreScrollStateArg
    }
  | {
      // Given a function, map it to each data (depends on mode)
      _tag: 'MapFunc'
      func: (a: A) => A
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      // Given a function, run it against all the data
      _tag: 'ReplaceFunc'
      func: (
        a: SortedUniqueArray<A>,
      ) => [SortedUniqueArray<A>, AppRouteUpdater<Route>]
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
  //   result: E.Either<string, A[]>
  //   invokeTime: Date
  // }
  | {
      _tag: 'ReplaceFuncAsync'
      // TODO: setGlobalMsg is a hack to be able to call navigate in this function
      // When link pagin become tea-cup component, we can remove this hack
      func: (
        a: SortedUniqueArray<A>,
      ) => Promise<[SortedUniqueArray<A>, AppRouteUpdater<Route>]>
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      _tag: 'SetIsScrolling'
      value: boolean
      savedScrollPos?: number
    }
  // Triggered when the prev/next trigger buttons enter the viewport or are clicked
  | { _tag: 'GetMorePrevData' }
  | {
      _tag: 'GetMorePrevDataFromCacheResponse'
      dataSourceId: string
      endpoint: EndpointHandler<A>
      cache: RD.RemoteData<HttpErrorString, A[]>
    }
  | {
      _tag: 'GetMorePrevDataFromApiResponse'
      dataSourceId: string
      overallDataBeforeCache: A[]
      result: E.Either<HttpErrorString, A[]>
    }
  | { _tag: 'GetMoreNextData' }
  | {
      _tag: 'GetMoreNextDataFromCacheResponse'
      dataSourceId: string
      endpoint: EndpointHandler<A>
      cache: RD.RemoteData<HttpErrorString, A[]>
    }
  | {
      _tag: 'GetMoreNextDataFromApiResponse'
      dataSourceId: string
      overallDataBeforeCache: A[]
      result: E.Either<HttpErrorString, A[]>
    }
  // --------------------------------------------
  // Datasource specific
  | {
      // Find and update existing data. If it does not exist, add the data.
      _tag: 'AddOrUpdateData'
      dataSourceId: string
      value: { data: A; previousId: string | null }[]
      compareId: (a: A, b: string) => boolean
    }
  | {
      _tag: 'SetPrevData'
      dataSourceId: string
      value: RD.RemoteData<HttpErrorString, A[]>
      isFirstLoad: boolean
    }
  | {
      _tag: 'AddToPrevOverallData'
      dataSourceId: string
      value: A[]
    }
  | {
      _tag: 'SetPrevIsMax'
      dataSourceId: string
      value: boolean
    }
  | {
      _tag: 'SetNextData'
      dataSourceId: string
      value: RD.RemoteData<HttpErrorString, A[]>
    }
  | {
      _tag: 'AddToNextOverallData'
      dataSourceId: string
      value: A[]
    }
  | {
      _tag: 'SetNextIsMax'
      dataSourceId: string
      value: boolean
    }
  | {
      _tag: 'SetInitialData'
      dataSourceId: string
      value: RD.RemoteData<HttpErrorString, A[]>
    }
  | {
      _tag: 'SetReTriggerCurrentData'
      dataSourceId: string
      value: 'start' | 'done'
    }
  | {
      _tag: 'SetAnimationEnd'
      dataSourceId: string
      value: boolean
    }
  | {
      _tag: 'SetNewSelectedKey'
      dataSourceId: string
      selectedKey: string | null
      triggerScrollToCurrent?: ScrollToCurrentParam
      shouldReload?: true
    }
  | {
      _tag: 'GetInitialData'
    }
  | {
      _tag: 'GetInitialDataFromCacheResponse'
      dataSourceId: string
      cache: RD.RemoteData<HttpErrorString, A[]>
    }
  | {
      _tag: 'GetInitialDataFromApiResponse'
      dataSourceId: string
      result: E.Either<HttpErrorString, InitialEndpointResponse<A>>
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
      subMsg: amsg
    }

// Stable IDs for the prev/next InView trigger buttons, derived from the data source.
export const prevButtonId = (dataSourceId: string): string =>
  `link-pagin-prev-btn-${dataSourceId}`
export const nextButtonId = (dataSourceId: string): string =>
  `link-pagin-next-btn-${dataSourceId}`

// -------------------------------------------
// Scroll State Map & Helper
// -------------------------------------------

export type ScrollStateMap = Map<string, number>

export const mkScrollStateMap = (): ScrollStateMap => new Map()

export const storeScrollState =
  (map: ScrollStateMap) =>
  (dataSourceId: string, el: HTMLDivElement): void => {
    map.set(dataSourceId, el.scrollTop)
  }

export const restoreScrollState =
  (map: ScrollStateMap) =>
  (dataSourceId: string, el: HTMLDivElement): void => {
    const pos = map.get(dataSourceId)
    if (pos !== undefined) {
      el.scrollTo({ top: pos })
    }
  }

export const mkShouldRestoreScrollState = (
  dataSourceId: string,
  map: ScrollStateMap,
): ShouldRestoreScrollStateArg => ({
  checkShouldRestore: () =>
    map.has(dataSourceId) ? { _tag: 'ScrollState' } : { _tag: 'NoOp' },
  restore: restoreScrollState(map),
})
