import * as RD from '@devexperts/remote-data-ts'
import { NullableEq } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import type * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import { type Option } from 'fp-ts/lib/Option'
import type * as OrdClass from 'fp-ts/lib/Ord'
import type * as TE from 'fp-ts/lib/TaskEither'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { type JSX, type RefObject } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import * as CacheData from './type/cache-data'
import { type ScrollStateMap } from './type/scroll-state'
import * as SUA from './type/sorted-unique-array'
import { type SortedUniqueArray } from './type/sorted-unique-array'

export * as CacheData from './type/cache-data'
export * as SUA from './type/sorted-unique-array'
export * from './type/scroll-state'
export type { SortedUniqueArray }

export const dataSourceIdAttribute = 'data-datasource-id'
export const linkItemKeyAttribute = 'data-link-item-key'

export type Size = {
  readonly _tag: 'Size'
  readonly value: number
}

export const size = (value: number): Size => ({ _tag: 'Size', value })
export const defaultPageSize = 50

export const SizeEq: EqClass.Eq<Size> = EqClass.struct<Size>({
  _tag: S.Eq,
  value: N.Eq,
})

export type Refs = {
  currentScrollPosRef: { current: number }
  currentScrollHeightRef: { current: number }
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

export type EndpointHandler<A> = (
  networkStatus: boolean,
  cacheData: A[],
) => TE.TaskEither<string, A[]>

export type InitialEndpointResponse<A> = {
  dataF: (currentOverall: A[]) => A[]
  nextIsMax: boolean
}

export type InitialEndpointHandler<A> = (
  networkStatus: boolean,
  cacheData: A[],
) => TE.TaskEither<string, InitialEndpointResponse<A>>

export type ContainerChangeEvent =
  | { _tag: 'ElementModifyOnTop' }
  | { _tag: 'ElementModifyOnBottom' }
  | { _tag: 'ElementModifyInPlace' }
  | { _tag: 'ForceManipulateScrollPos' }
  | { _tag: 'NoChange' }

export type InitialHandler<A> = () => {
  cache: CacheHandler<A>
  endpoint: InitialEndpointHandler<A>
}

export type Mode<A> = {
  dataSourceId: string

  prevHandler: (overallData: A[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<A[]>>
    endpoint: EndpointHandler<A>
  }
  overallData: SortedUniqueArray<A>
  prevData: RD.RemoteData<string, A[]>
  prevSize: Size
  prevIsMax: boolean
  allowRetryPrev: boolean

  initialHandler: InitialHandler<A>
  initialData: RD.RemoteData<string, A[]>

  selectedKey: string | null

  nextHandler: (overallData: A[]) => (size: Size) => {
    cache: () => Promise<CacheData.Type<A[]>>
    endpoint: EndpointHandler<A>
  }
  nextData: RD.RemoteData<string, A[]>
  nextSize: Size
  nextIsMax: boolean

  retriggerCurrentData: 'start' | 'done'
  animationEnd: boolean
}

export function mkModeEq<A>(aEq: EqClass.Eq<A>) {
  return EqClass.struct<Mode<A>>({
    dataSourceId: S.Eq,
    prevHandler: { equals: () => true },
    overallData: SUA.getEq(aEq),
    prevData: RD.getEq(S.Eq, A.getEq(aEq)),
    prevSize: SizeEq,
    prevIsMax: B.Eq,
    allowRetryPrev: B.Eq,
    initialHandler: { equals: () => true },
    initialData: RD.getEq(S.Eq, A.getEq(aEq)),
    selectedKey: NullableEq(S.Eq),
    nextHandler: { equals: () => true },
    nextData: RD.getEq(S.Eq, A.getEq(aEq)),
    nextSize: SizeEq,
    nextIsMax: B.Eq,
    retriggerCurrentData: S.Eq,
    animationEnd: B.Eq,
  })
}

export function defaultMode<A>(): Mode<A> {
  return {
    dataSourceId: '',
    prevHandler: () => () => ({
      cache: async () => CacheData.fromRD(RD.initial),
      endpoint: () => async () => ({ _tag: 'Right', right: [] }),
    }),
    overallData: SUA.empty(),
    prevData: RD.initial,
    prevSize: size(defaultPageSize),
    prevIsMax: false,
    allowRetryPrev: false,

    initialHandler: () => ({
      cache: async () => CacheData.fromRD(RD.initial),
      endpoint: () => async () => ({
        _tag: 'Right',
        right: { dataF: () => [], nextIsMax: true },
      }),
    }),
    initialData: RD.initial,
    selectedKey: null,
    retriggerCurrentData: 'done',
    animationEnd: false,

    nextHandler: () => () => ({
      cache: async () => CacheData.fromRD(RD.initial),
      endpoint: () => async () => ({ _tag: 'Right', right: [] }),
    }),
    nextData: RD.initial,
    nextSize: size(defaultPageSize),
    nextIsMax: false,
  }
}

export type VisibleStrategy = { _tag: 'FullInView' } | { _tag: 'HalfInView' }

export const VisibleStrategyEq = EqClass.struct<VisibleStrategy>({
  _tag: S.Eq,
})

export type WithPrevAndNext<A> = {
  nextA: A | null
  a: A
  prevA: A | null
}

export type CustomUiParam<A, ItemMsg> = {
  withPrevNextA: WithPrevAndNext<A>
  selectedA: Option<A>
  retriggerCurrentData: 'start' | 'done'
  animationEnd: boolean
  dataSourceId: string
  allA: A[]
  dispatch: (msg: ItemMsg) => void
}

export type LogicConfig<A> = {
  refs: Refs
  mode: Mode<A>
  isReversed: boolean
  eqWithKey: EqClass.Eq<A>
  ord: OrdClass.Ord<A>
  uniqueKeyField: (a: A) => string
  visibleStrategy: VisibleStrategy
  scrollStateMap?: ScrollStateMap
}

export type UiConfig<A, ItemMsg> = {
  customItemUi: (param: CustomUiParam<A, ItemMsg>) => JSX.Element
  customAllItemUi?: (
    allA: WithPrevAndNext<A>[],
    allItemUi: (data: WithPrevAndNext<A>[]) => JSX.Element[],
    configIsReversed: boolean,
  ) => JSX.Element[]
  customAllItemEffect?: (
    containerRef: RefObject<HTMLDivElement | null>,
    timerRef: RefObject<ReturnType<typeof setTimeout> | null>,
    isScrolling: boolean,
  ) => void

  scrollbarClass?: string
  disableScrolling?: boolean
  titleView?: (() => JSX.Element) | null
  scrollToLatestCustomUi?:
    | ((props: { onClick: () => void; isVisible: boolean }) => JSX.Element)
    | null
  loadingView?: (() => JSX.Element) | null
  prevLoadingIndicatorView?: () => JSX.Element | null
  nextLoadingIndicatorView?: () => JSX.Element | null
  prevIsMaxCustomView?: () => JSX.Element | null
  nextIsMaxCustomView?: () => JSX.Element | null
}

export type Config<A, ItemMsg> = {
  logic: LogicConfig<A>
  ui: UiConfig<A, ItemMsg>
}

export function mkLogicConfigEq<A>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<LogicConfig<A>>({
    refs: { equals: () => true },
    mode: mkModeEq(eqA),
    isReversed: B.Eq,
    eqWithKey: { equals: () => true },
    ord: { equals: () => true },
    uniqueKeyField: { equals: () => true },
    visibleStrategy: VisibleStrategyEq,
    scrollStateMap: { equals: () => true },
  })
}

export function mkUiConfigEq<A, _ItemMsg>(_eqA: EqClass.Eq<A>) {
  return {
    equals: () => true,
  }
}

export function mkConfigEq<A, ItemMsg>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<Config<A, ItemMsg>>({
    logic: mkLogicConfigEq(eqA),
    ui: mkUiConfigEq(eqA),
  })
}

export type Model<A> = {
  mode: Mode<A>
  containerChangeEvent: ContainerChangeEvent
  invisWhileScrolling: boolean
  isScrolling: boolean
  savedScrollPos: number | null
  scrollStateMap: ScrollStateMap
}

export function mkModelEq<A>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<Model<A>>({
    mode: mkModeEq(eqA),
    containerChangeEvent: EqClass.struct({ _tag: S.Eq }),
    invisWhileScrolling: B.Eq,
    isScrolling: B.Eq,
    savedScrollPos: NullableEq(N.Eq),
    scrollStateMap: { equals: () => true },
  })
}

export type ScrollToCurrentParam = {
  isGraceful: boolean
  isSearching?: boolean
}

export type Props<A, ItemMsg> = {
  aEq: EqClass.Eq<A>
  config: Config<A, ItemMsg>
  dispatch: Dispatcher<Msg<A, ItemMsg>>
  model: Model<A>
}

export function mkPropsEq<A, ItemMsg>(eqA: EqClass.Eq<A>) {
  return EqClass.struct<Props<A, ItemMsg>>({
    aEq: { equals: () => true },
    config: mkConfigEq(eqA),
    dispatch: { equals: () => true },
    model: mkModelEq(eqA),
  })
}

export type Msg<A, ItemMsg> =
  | { _tag: 'NoOp' }
  | { _tag: 'SetState'; value: Model<A> }
  | {
      _tag: 'SetModeAndAddUpdateData'
      mode: Mode<A>
      data: A | null
      shouldReload?: true
    }
  | {
      _tag: 'MapFunc'
      func: (a: A) => A
      containerChangeEvent?: ContainerChangeEvent
    }
  | {
      _tag: 'ReplaceFunc'
      func: (a: SortedUniqueArray<A>) => SortedUniqueArray<A>
      containerChangeEvent?: ContainerChangeEvent
    }
  | { _tag: 'SetContainerChangeEvent'; value: ContainerChangeEvent }
  | { _tag: 'ScrollToNewest' }
  | { _tag: 'ForceScrollTo'; top: number }
  | { _tag: 'ScrollToKey'; key: string }
  | {
      _tag: 'GetInitialData'
      dataSourceId: string
      networkStatus: boolean
    }
  | {
      _tag: 'GetInitialDataFromCacheResponse'
      dataSourceId: string
      cache: RD.RemoteData<string, A[]>
    }
  | {
      _tag: 'GetInitialDataFromApiResponse'
      dataSourceId: string
      result: E.Either<string, InitialEndpointResponse<A>>
    }
  | {
      _tag: 'GetMorePrevData'
      dataSourceId: string
      networkStatus: boolean
    }
  | {
      _tag: 'GetMorePrevDataFromCacheResponse'
      dataSourceId: string
      cache: RD.RemoteData<string, A[]>
    }
  | {
      _tag: 'GetMorePrevDataFromApiResponse'
      dataSourceId: string
      result: E.Either<string, A[]>
    }
  | {
      _tag: 'GetMoreNextData'
      dataSourceId: string
      networkStatus: boolean
    }
  | {
      _tag: 'GetMoreNextDataFromCacheResponse'
      dataSourceId: string
      cache: RD.RemoteData<string, A[]>
    }
  | {
      _tag: 'GetMoreNextDataFromApiResponse'
      dataSourceId: string
      result: E.Either<string, A[]>
    }
  | {
      _tag: 'SetNewSelectedKey'
      dataSourceId: string
      selectedKey: string | null
      triggerScrollToCurrent?: ScrollToCurrentParam
      shouldReload?: true
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
      _tag: 'ContainerScroll'
      isScrolling: boolean
    }
  | {
      _tag: 'ItemMsg'
      item: A
      msg: ItemMsg
    }

export const prevButtonId = (dataSourceId: string): string =>
  `link-pagin-prev-btn-${dataSourceId}`
export const nextButtonId = (dataSourceId: string): string =>
  `link-pagin-next-btn-${dataSourceId}`
