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
import {
  cmdFromPromise,
  cmdSucceed,
  cmdSucceedWithMsg,
  errorToString,
  filterUnique,
  updateAndCmd,
} from '@rinn7e/tea-cup-prelude'
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import type * as CacheData from '@rinn7e/tea-cup-prelude/type/cache-data'
import {
  type HttpErrorString,
  mkHttpError,
} from '@rinn7e/tea-cup-prelude/type/http-error'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { type SortedUniqueArray } from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import { type IO } from 'fp-ts/lib/IO'
import type * as TE from 'fp-ts/lib/TaskEither'
import { identity, pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  type ContainerChangeEvent,
  type Edge,
  type EndpointHandler,
  type InitialEndpointResponse,
  type InitialScroll,
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
  type Refs,
  type ScrollToCurrentParam,
  type ShouldRestoreScrollStateArg,
} from './type'
import {
  addOrUpdateData,
  isItemEqual,
  keyEq,
  removeElFromArray,
  reopenEdge,
  reopenPrev,
  replaceFuncActionHandler,
  replaceFuncActionHandlerAsync,
  setContainerChangeEvent,
  setOrKeepContainerChangeEvent,
} from './util'

/**
 * Loads the initial page of data for a freshly mounted list.
 *
 * Backs the `GetInitialData` message and is invoked internally by `init()`.
 * It always resets `initialScroll` to `Pending` and sets `initial` to
 * `Loading`, since a new mount has no committed scroll position and
 * nothing meaningful to show while the load is in flight.
 *
 * Do not dispatch `GetInitialData` for a list that is already mounted and
 * visible — that discards the currently displayed data and re-arms the
 * one-time initial scroll. To refresh an already-mounted list in place,
 * dispatch `RefreshInitialData` (handled by {@link refreshInitialDataHandler})
 * instead.
 */
export const getInitialDataHandler =
  (networkStatus: boolean) =>
  <Item, ItemMsg, Route>(
    model: Model<Item>,
  ): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
    const currentDataSourceId = model.mode.dataSourceId
    const newModel = {
      ...model,
      initialScroll: { _tag: 'Pending' },
      mode: {
        ...model.mode,
        initial: { _tag: 'Loading' },
      },
    } satisfies Model<Item>
    return [
      newModel,
      getInitialDataFromCacheCmd(networkStatus, currentDataSourceId, newModel),
    ]
  }

/**
 * Re-fetches the initial page of data for a list that is already mounted
 * and visible, without disturbing what the user is currently looking at.
 *
 * Backs the `RefreshInitialData` message. Use this to silently update an
 * open list — for example in response to a real-time push event — while the
 * user keeps looking at it:
 *
 * - If data is already loaded (`overallData` is non-empty), `initial`
 *   is left untouched so the list stays visible; only the underlying data
 *   is re-fetched in the background.
 * - If no data is loaded yet, `initial` is set to `Loading`, same as
 *   a fresh load.
 * - `initialScroll` is never modified. The one-time initial scroll for
 *   this mount was already resolved (or intentionally was not owed), and a
 *   background refresh must not re-trigger it.
 *
 * For the initial load of a newly mounted list, dispatch `GetInitialData`
 * (handled by {@link getInitialDataHandler}) instead.
 */
export const refreshInitialDataHandler =
  (networkStatus: boolean) =>
  <Item, ItemMsg, Route>(
    model: Model<Item>,
  ): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
    const currentDataSourceId = model.mode.dataSourceId
    const hasData = model.mode.overallData.value.length !== 0
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        initial: hasData ? model.mode.initial : { _tag: 'Loading' },
      },
    } satisfies Model<Item>
    return [
      newModel,
      getInitialDataFromCacheCmd(networkStatus, currentDataSourceId, newModel),
    ]
  }

/**
 * Both {@link getInitialDataHandler} and {@link refreshInitialDataHandler}
 * delegate to the same two-leg load sequence implemented by this function
 * and {@link getInitialDataFromApiResponseHandler}: a cache lookup, followed
 * by an API request. Both legs share the same invariants:
 *
 * - The list scrolls to its target at most once per mount, on whichever leg
 *   is first able to resolve the target with confidence.
 * - An already-loaded list is never reverted to a loading state by a
 *   subsequent refetch.
 *
 * The cache leg and the API leg resolve the same scroll target, but the API
 * response may reassign or clear `selectedKey`
 * (`InitialEndpointResponse.selectedKey`) — for example, when the previously
 * selected item is no longer available and the view falls back to the
 * newest unread item. So while a list opens at a target (`selectedKey`):
 *
 * - If the cached rows contain the target, the cache leg shows them and
 *   scrolls to it right away (`initialScroll` is `FromCache`). The API
 *   almost always confirms it; the API leg scrolls again only if it moved
 *   the target or the rows changed.
 * - If they don't, the cache leg doesn't show them: the list would show at
 *   a place the open won't stay at, and loading the page next to it. The
 *   loader stays until the API leg, which scrolls. The API request still
 *   gets the cached rows (to drop stale ones).
 *
 * Without a target (the newest page), the cache leg shows its rows and
 * scrolls, and the API leg doesn't scroll again.
 */
export const getInitialDataFromCacheResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  networkStatus: boolean,
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  cache: RD.RemoteData<HttpErrorString, Item[]>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const cacheItems = cache._tag === 'RemoteSuccess' ? cache.value : []
    const selectedKey = m.mode.selectedKey
    const isOpening = m.initialScroll._tag === 'Pending'
    const targetIsCached =
      selectedKey === null ||
      cacheItems.some((item) => config.uniqueKeyField(item) === selectedKey)
    const showCache = cacheItems.length !== 0 && (!isOpening || targetIsCached)
    const newModel = showCache
      ? pipe({
          ...m,
          mode: {
            ...m.mode,
            // A list the API already answered stays `Loaded` through a
            // refresh: its ends load from rows the API gave, and keeping it
            // keeps the views at the ends (a trigger appearing and going
            // away above a reversed list moves the view in WebKit).
            initial:
              m.mode.initial._tag === 'Loaded'
                ? m.mode.initial
                : { _tag: 'Cached' },
            overallData: pipe(
              cacheItems,
              SUA.fromArray(keyEq(config), config.ord),
            ),
          },
        } satisfies Model<Item>)
      : m

    const shouldScroll = isOpening && showCache
    const initialScroll: InitialScroll = !shouldScroll
      ? newModel.initialScroll
      : selectedKey === null
        ? { _tag: 'Done' }
        : { _tag: 'FromCache', key: selectedKey }

    return pipe(
      [
        { ...newModel, initialScroll },
        getInitialDataFromApiCmd(
          networkStatus,
          newModel,
          showCache ? newModel.mode.overallData.value : cacheItems,
        ),
      ] satisfies [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>],
      shouldScroll
        ? updateAndCmd(scrollToCurrentHandler(config, { isGraceful: false }))
        : identity,
    )
  } else return [m, Cmd.none()]
}

// Whether two lists hold the same items, in the same order.
const sameKeys = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  a: Item[],
  b: Item[],
): boolean =>
  a.length === b.length &&
  a.every(
    (item, i) => config.uniqueKeyField(item) === config.uniqueKeyField(b[i]),
  )

// Handle api resposne
export const getInitialDataFromApiResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  result: E.Either<HttpErrorString, InitialEndpointResponse<Item>>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    // Cache is saved to overallData, so we can just check that
    const cacheExist = m.mode.overallData.value.length > 0

    const newModel = (() => {
      if (result._tag === 'Left') {
        // With rows shown, they stay: the cached ones are what there is
        return cacheExist
          ? ({
              ...m,
              mode: { ...m.mode, initial: { _tag: 'Loaded' } },
            } satisfies Model<Item>)
          : ({
              ...m,
              mode: {
                ...m.mode,
                initial: { _tag: 'Failed', error: result.left },
              },
            } satisfies Model<Item>)
      }
      if (result._tag === 'Right') {
        // We pass current overall data to ensure that, transformation func
        // in the config has access to latest overall data (which is populated
        // by cache initiall)
        const newOverallData = result.right.dataF(m.mode.overallData.value)
        return pipe({
          ...m,
          mode: {
            ...m.mode,
            initial: { _tag: 'Loaded' },
            // A load in flight or a failure of the newer end is kept: this
            // response only says whether there is anything newer
            next: result.right.nextIsMax
              ? { _tag: 'Exhausted' }
              : reopenEdge(m.mode.next),
            selectedKey:
              result.right.selectedKey === undefined
                ? m.mode.selectedKey
                : result.right.selectedKey,
            overallData: pipe(
              newOverallData,
              SUA.fromArray(keyEq(config), config.ord),
            ),
          },
        } satisfies Model<Item>)
      } else return m
    })()

    // Scroll here unless the cache leg already did. This is the leg that
    // resolves the final target, since the API response may have reassigned
    // or cleared `selectedKey` after the cache leg ran — so it is the last
    // opportunity to scroll for this mount. After a scroll to the cached
    // rows, scroll again (hidden while it runs) only if the API moved the
    // target; if it only changed the rows, scroll without hiding, which moves
    // the view only if the target left it. Once `initialScroll` is `Done`, it
    // is also what prevents a later refresh (via `refreshInitialDataHandler`)
    // from moving the view again.
    // A first load that failed with nothing to show hasn't opened the list:
    // the open (and its scroll) is still owed to the load that brings rows.
    const openFailed = newModel.mode.initial._tag === 'Failed'

    const scroll = ((): ScrollToCurrentParam | null => {
      if (openFailed) return null
      switch (m.initialScroll._tag) {
        case 'Pending':
          return { isGraceful: false }
        case 'FromCache':
          if (newModel.mode.selectedKey !== m.initialScroll.key) {
            return { isGraceful: false }
          } else if (
            !sameKeys(
              config,
              newModel.mode.overallData.value,
              m.mode.overallData.value,
            )
          ) {
            return { isGraceful: true }
          } else {
            return null
          }
        case 'Done':
          return null
      }
    })()

    return pipe(
      {
        ...newModel,
        initialScroll: openFailed ? m.initialScroll : { _tag: 'Done' },
      } satisfies Model<Item>,
      scroll ? scrollToCurrentHandler(config, scroll) : (m) => [m, Cmd.none()],
    )
  } else return [m, Cmd.none()]
}

export const setNewSelectedKeyHandler = <Item, Parent, ItemMsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  msg: {
    dataSourceId: string
    selectedKey: string | null
    triggerScrollToCurrent?: ScrollToCurrentParam
    shouldReload?: true
  },
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (msg.dataSourceId === model.mode.dataSourceId) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        selectedKey: msg.selectedKey,
      },
    } satisfies Model<Item>

    return pipe(
      newModel,
      // `shouldReload` here means the mounted list's TARGET is changing (a
      // new `selectedKey`), which is a genuine re-resolution — closer to
      // `init()` than to a same-target refresh — so this intentionally calls
      // `getInitialDataHandler`, not `refreshInitialDataHandler`, even though
      // no live call site sets `shouldReload` today.
      msg.shouldReload
        ? getInitialDataHandler(networkStatus)
        : (m) =>
            [m, Cmd.none()] satisfies [
              Model<Item>,
              Cmd<Msg<Item, ItemMsg, Route>>,
            ],
      msg.triggerScrollToCurrent
        ? updateAndCmd(
            scrollToCurrentHandler(config, msg.triggerScrollToCurrent),
          )
        : identity<[Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>]>,
    )
  } else return [model, Cmd.none()]
}

export const setModeAndAddUpdateDataHandler = <Item, Parent, ItemMsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  msg: {
    mode: Mode<Item>
    data: Item | null // new data to be added right after changing the mode (mainly used by SSE)
    shouldReload?: true
    onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => IO<void>
    shouldRestoreScrollState?: ShouldRestoreScrollStateArg
  },
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  const [resultState, containerChangeEvent] = pipe(
    {
      ...model,
      mode: { ...msg.mode },
      // The rows are replaced: a change to the old ones has nothing to apply to
      pendingChange: { _tag: 'None' },
    } satisfies Model<Item>,
    (st) =>
      msg.data
        ? addOrUpdateData(config, msg.data, null)(st)
        : [st, { _tag: 'NoChange' } as ContainerChangeEvent],
  )
  return pipe(
    [
      setContainerChangeEvent(
        config.refs,
        containerChangeEvent,
      )({
        ...resultState,
        onContainerScroll: msg.onContainerScroll,
        shouldRestoreScrollState: msg.shouldRestoreScrollState,
      }),
      Cmd.none(),
    ] satisfies [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>],
    // `shouldReload` here means a whole new `mode` is being installed — again
    // a genuine re-resolution of the target, not a refresh of the current
    // one — so this intentionally calls `getInitialDataHandler`, not
    // `refreshInitialDataHandler`, even though no live call site sets
    // `shouldReload` today.
    msg.shouldReload
      ? updateAndCmd<Msg<Item, ItemMsg, Route>, Model<Item>>(
          getInitialDataHandler(networkStatus),
        )
      : identity,
  )
}

export const scrollToNewestHandler = <Item, ItemMsg, Route>(
  refs: Refs,
  isReversed: boolean,
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  return [
    model,
    cmdSucceed(() => {
      if (refs.containerRef.current) {
        const container = refs.containerRef.current
        const targetScroll = isReversed ? container.scrollHeight : 0
        container.scroll({ top: targetScroll, behavior: 'smooth' })
      }
    }),
  ]
}

export const scrollToKeyHandler = <Item, ItemMsg, Route>(
  refs: Refs,
  model: Model<Item>,
  itemKey: string,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  return [
    model,
    cmdSucceed(() => {
      const element = refs.itemRefs.current[itemKey]

      if (!element) {
        return console.warn(
          'ScrollToKey: Unable to find element with id',
          itemKey,
        )
      }
      element.classList.remove('bg-fade-out')
      requestAnimationFrame(() => {
        if (!refs.containerRef.current)
          return console.warn('ScrollToMessage: Unable to find container')

        const container = refs.containerRef.current
        const elementRect = element.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // compute element's top relative to container
        const elementTop = elementRect.top - containerRect.top

        // adjust for searchbar height
        const offsetTop = container.scrollTop + elementTop - 95

        container.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        })

        element.classList.add('bg-fade-out')
      })
    }),
  ]
}

export const forceScrollToHandler = <Item, ItemMsg, Route>(
  refs: Refs,
  model: Model<Item>,
  msg: { top: number },
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  return [
    { ...model, visibility: { _tag: 'HiddenForRestore' } },
    cmdSucceedWithMsg(
      () => {
        if (refs.containerRef.current) {
          const newTop = msg.top
          const container = refs.containerRef.current
          container.scrollTo({ top: newTop })
        }
      },
      () =>
        ({
          _tag: 'RestoreDone',
          dataSourceId: model.mode.dataSourceId,
        }) satisfies Msg<Item, ItemMsg, Route>,
    ),
  ]
}

// Run `msg.func` against all the items; it may also change the route. Sets
// the change the rows go through (`msg.containerChangeEvent`), or keeps the
// pending one.
export const replaceFuncHandler = <Item, Parent, ItemMsg, Route>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  msg: {
    func: (
      items: SortedUniqueArray<Item>,
    ) => [SortedUniqueArray<Item>, AppRouteUpdater<Route>]
    containerChangeEvent?: ContainerChangeEvent
  },
): [Model<Item>, AppRouteUpdater<Route>] => {
  const [newModel, routeUpdater] = replaceFuncActionHandler(model, msg.func)
  return [
    setOrKeepContainerChangeEvent(
      config.refs,
      msg.containerChangeEvent,
    )(newModel),
    routeUpdater,
  ]
}

// `replaceFuncHandler` for a change of each item, which doesn't change the
// route.
export const mapFuncHandler = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  msg: {
    func: (item: Item) => Item
    containerChangeEvent?: ContainerChangeEvent
  },
): Model<Item> => {
  const [newModel] = replaceFuncHandler(config, model, {
    func: (as) => [SUA.map(keyEq(config), config.ord)(msg.func)(as), null],
    containerChangeEvent: msg.containerChangeEvent,
  })
  return newModel
}

export const addOrUpdateDataHandler = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  msg: {
    dataSourceId: string
    value: { data: Item; previousId: string | null }[]
    compareId: (item: Item, id: string) => boolean
  },
): Model<Item> => {
  if (msg.dataSourceId === model.mode.dataSourceId) {
    // console.log(
    //   '[MSG_STATE][reducer] AddOrUpdateData msg received:',
    //   msg.value,
    // )

    const [resultState, resultCurrentTopElementChange] = pipe(
      msg.value,
      A.reduce([model, 0] as [Model<Item>, number], (acc, el) => {
        const [currentState, currentTopElementChange] = acc
        const [newState, elementChange] = addOrUpdateData(
          config,
          el.data,
          el.previousId,
          msg.compareId,
        )(currentState)
        const newCurrentTopElementChange = (() => {
          switch (elementChange._tag) {
            case 'ElementModifyOnTop':
              return currentTopElementChange + 1
            default:
              return currentTopElementChange
          }
        })()

        // console.log('[MSG_STATE][reducer] processing element:', el, {
        //   elementChange,
        //   newCurrentTopElementChange,
        // })

        return [newState, newCurrentTopElementChange]
      }),
    )

    const containerChangeEvent = ((): ContainerChangeEvent => {
      if (resultCurrentTopElementChange > 0)
        return { _tag: 'ElementModifyOnTop' }
      else if (resultCurrentTopElementChange < 0) return { _tag: 'NoChange' }
      else return { _tag: 'ElementModifyInPlace' }
    })()

    // console.log(
    //   '[MSG_STATE][reducer] final containerChangeEvent:',
    //   containerChangeEvent,
    // )

    return setContainerChangeEvent(
      config.refs,
      containerChangeEvent,
    )(reopenPrev(resultState))
  } else return model
}

// -------------------------------------------------------------
// Cmd
// -------------------------------------------------------------

export const getInitialDataFromCacheCmd = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  model: Model<Item>,
): Cmd<Msg<Item, ItemMsg, Route>> => {
  return cmdFromPromise(
    async () => {
      const { cache } = model.mode.initialHandler()

      const cacheResult = (await cache(networkStatus)).data
      return pipe(cacheResult, RD.mapLeft(mkHttpError))
    },
    (r) => {
      if (r.tag === 'Ok')
        return {
          _tag: 'GetInitialDataFromCacheResponse',
          dataSourceId,
          cache: r.value,
        } satisfies Msg<Item, ItemMsg, Route>
      else {
        // A cache that can't be read is no cache: the API request still runs.
        console.warn(
          'Error from func: getInitialDataFromCacheCmd: ' +
            errorToString(r.err),
        )
        return {
          _tag: 'GetInitialDataFromCacheResponse',
          dataSourceId,
          cache: RD.failure(mkHttpError(errorToString(r.err))),
        } satisfies Msg<Item, ItemMsg, Route>
      }
    },
  )
}

// Run an endpoint and send its result. A `Left` is the endpoint's own error and
// is passed on as it is. An endpoint that throws instead (e.g. while saving its
// response) is reported as a failed response too, so the list doesn't stay
// loading.
const runEndpoint = <Result, M>(
  name: string,
  endpoint: TE.TaskEither<HttpErrorString, Result>,
  toMsg: (result: E.Either<HttpErrorString, Result>) => M,
): Cmd<M> =>
  cmdFromPromise(endpoint, (r) => {
    if (r.tag === 'Ok') {
      return toMsg(r.value)
    } else {
      console.warn(`Error from func: ${name}: ` + errorToString(r.err))
      return toMsg(E.left(mkHttpError(errorToString(r.err))))
    }
  })

export const getInitialDataFromApiCmd = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  model: Model<Item>,
  // The cached rows, shown or not, so the endpoint can drop stale ones.
  cacheData: Item[],
): Cmd<Msg<Item, ItemMsg, Route>> => {
  const { endpoint } = model.mode.initialHandler()

  return runEndpoint(
    'getInitialDataFromApiCmd',
    endpoint(networkStatus, cacheData),
    (result) =>
      ({
        _tag: 'GetInitialDataFromApiResponse',
        dataSourceId: model.mode.dataSourceId,
        result,
      }) satisfies Msg<Item, ItemMsg, Route>,
  )
}

// TODO: broken (`SetState` replaces the model with one built from `model`, as
// it was when `ReplaceFuncAsync` arrived), see `ReplaceFuncAsync` in `type.ts`
export const replaceFuncAsyncCmd = <Item, ItemMsg, Route>(
  model: Model<Item>,
  msg: {
    func: (
      items: SortedUniqueArray<Item>,
    ) => Promise<[SortedUniqueArray<Item>, AppRouteUpdater<Route>]>
    containerChangeEvent?: ContainerChangeEvent
  },
): Cmd<Msg<Item, ItemMsg, Route>> => {
  return cmdFromPromise(
    async () => {
      const newState = await replaceFuncActionHandlerAsync(model, msg.func)
      return newState
    },
    (r) => {
      if (r.tag === 'Ok')
        return {
          _tag: 'SetState',
          value: r.value[0],
          routeUpdater: r.value[1],
          containerChangeEvent: msg.containerChangeEvent,
        }
      else {
        console.warn(
          'Error from func: getBundleFromCacheCmd: ' + errorToString(r.err),
        )
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const scrollToCurrentHandler =
  <Item, Parent, ItemMsg, Route>(
    logicConfig: LogicConfig<Item, Parent, ItemMsg>,
    param: ScrollToCurrentParam,
  ) =>
  (model: Model<Item>): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
    const containerRef = logicConfig.refs.containerRef

    if (model.shouldRestoreScrollState && containerRef.current) {
      const containerRefCurrent = containerRef.current
      const { checkShouldRestore, restore } = model.shouldRestoreScrollState

      const shouldRestore = checkShouldRestore()

      if (shouldRestore._tag === 'ScrollState') {
        return checkVisibleAndScrollToCurrent({
          logicConfig,
          model,
          param,
          customScrollToCurrent: () =>
            restore(model.mode.dataSourceId, containerRefCurrent)(),
        })
      } else if (shouldRestore._tag === 'TargetKey') {
        return checkVisibleAndScrollToCurrent({
          logicConfig,
          model,
          param,
          elementId: shouldRestore.key,
        })
      }
    }

    return checkVisibleAndScrollToCurrent({ logicConfig, model, param })
  }

const waitForImagesLoadUpToCertainElement = async (
  items: [string, HTMLElement | null][],
  key: string,
) => {
  const promises: Promise<void>[] = items
    .splice(
      0,
      items.findIndex(([i]) => i === key),
    )
    .flatMap(([, element]) => {
      const imgs = [...(element?.querySelectorAll('img') ?? [])]
      return imgs
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              const onDone = () => {
                img.removeEventListener('load', onDone)
                img.removeEventListener('error', onDone)
                resolve()
              }
              img.addEventListener('load', onDone)
              img.addEventListener('error', onDone)
            }),
        )
    })
  // wait for image to load metadata
  await Promise.all(promises)
}

export const checkVisibleAndScrollToCurrent = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(args: {
  logicConfig: LogicConfig<Item, Parent, ItemMsg>
  model: Model<Item>
  param: ScrollToCurrentParam
  elementId?: string
  customScrollToCurrent?: () => void
}): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  const { logicConfig, model, param, elementId, customScrollToCurrent } = args

  const containerRef = logicConfig.refs.containerRef
  const itemRefs = logicConfig.refs.itemRefs

  const isVisible = (domElement: Element): Promise<boolean> => {
    return new Promise((resolve) => {
      const o = new IntersectionObserver(([entry]) => {
        if (logicConfig.visibleStrategy._tag === 'HalfInView')
          resolve(entry.intersectionRatio > 0.2)
        else resolve(entry.intersectionRatio === 1)

        o.disconnect()
      })
      o.observe(domElement)
    })
  }

  const scrollToCurrent = async () => {
    const refToScrollTo = (() => {
      if (elementId && itemRefs.current[elementId])
        return itemRefs.current[elementId]
      else if (
        !model.mode.selectedKey &&
        model.mode.overallData.value.length > 0
      ) {
        return itemRefs.current[
          logicConfig.uniqueKeyField(model.mode.overallData.value[0])
        ]
      } else if (model.mode.selectedKey) {
        return itemRefs.current[model.mode.selectedKey]
      }
    })()

    // console.log('SetScrollToCurrentEvent visible', currentRef.current)

    if (refToScrollTo) {
      await waitForImagesLoadUpToCertainElement(
        Object.entries(itemRefs.current),
        refToScrollTo.id,
      )

      const inView = await isVisible(refToScrollTo)

      // Scroll to currentRef
      if (!inView && containerRef.current) {
        if (logicConfig.visibleStrategy._tag === 'HalfInView')
          refToScrollTo.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          })
        else {
          refToScrollTo.scrollIntoView()
        }
      }
    }
  }

  return [
    {
      ...model,
      // If the scroll is from graceful msg, no need to turn invis
      visibility:
        param.isGraceful === false
          ? { _tag: 'HiddenForScroll', key: model.mode.selectedKey }
          : model.visibility,

      // Set is scroll to true if it is not already in scrolling
      isScrolling: model.isScrolling === false ? true : model.isScrolling,
    },
    cmdFromPromise(
      async () => {
        // This needed when we try to run `restore` func from scroll state map
        if (customScrollToCurrent) customScrollToCurrent()
        else await scrollToCurrent()

        // Record scroll pos
        // Note: we have to use `setTimeout` since the `containerRef.current.scrollTop`
        // is smaller than the actual scrollTop for some reason.
        setTimeout(() => {
          if (containerRef.current) {
            // Record the new scroll state into scroll_state map
            if (model.onContainerScroll)
              model.onContainerScroll(
                model.mode.dataSourceId,
                containerRef.current,
              )()
          }
        }, 500)
      },

      () => ({
        _tag: 'ScrollToCurrentDone',
        dataSourceId: model.mode.dataSourceId,
        selectedKey: model.mode.selectedKey,
      }),
      // () => ({ _tag: 'None' })
    ),
  ]
}

export const addToPrevOverallDataHandler = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  value: Item[],
): Model<Item> => {
  const overallData = pipe(
    model.mode.overallData,
    SUA.concat(keyEq(config), config.ord)(value),
  )

  const uniqueIncomingData = filterUnique(
    isItemEqual(config),
    value,
    model.mode.overallData.value,
  )

  return setContainerChangeEvent(
    config.refs,
    uniqueIncomingData.length > 0 && config.isReversed
      ? { _tag: 'ElementModifyOnTop' }
      : { _tag: 'NoChange' },
  )({
    ...model,
    mode: {
      ...model.mode,
      overallData,
    },
  })
}

export const addToNextOverallDataHandler = <Item, Parent, ItemMsg>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  model: Model<Item>,
  value: Item[],
): Model<Item> => {
  const overallData = pipe(
    model.mode.overallData,
    SUA.concat(keyEq(config), config.ord)(value),
  )

  const currentDataI = pipe(
    overallData,
    SUA.findIndex(
      (item) => config.uniqueKeyField(item) === model.mode.selectedKey,
    ),
  )
  const incomingNext =
    currentDataI >= 0
      ? removeElFromArray(config, overallData.value[currentDataI], value)
      : value

  const uniqueIncomingData = filterUnique(
    isItemEqual(config),
    incomingNext,
    model.mode.overallData.value,
  )

  return setContainerChangeEvent(
    config.refs,
    uniqueIncomingData.length > 0 && !config.isReversed
      ? { _tag: 'ElementModifyOnTop' }
      : { _tag: 'NoChange' },
  )({
    ...model,
    mode: {
      ...model.mode,
      overallData,
    },
  })
}

// Whether a load of the end can start.
const canLoad = (edge: Edge): boolean =>
  edge._tag === 'Idle' || edge._tag === 'Failed'

export const getMorePrevDataHandler = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  // An end that failed loads again: a retry
  if (
    canLoad(model.mode.prev) &&
    model.mode.initial._tag === 'Loaded' &&
    model.mode.overallData.value.length !== 0
  ) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        prev: { _tag: 'Loading' },
      },
    } satisfies Model<Item>
    const { cache, endpoint } = model.mode.prevHandler(
      model.mode.overallData.value,
    )(model.mode.prevSize)
    return [
      newModel,
      getMorePrevDataFromCacheCmd<Item, ItemMsg, Route>(
        networkStatus,
        model.mode.dataSourceId,
        cache,
        endpoint,
        newModel,
      ),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

export const getMorePrevDataFromCacheResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  networkStatus: boolean,
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  endpoint: EndpointHandler<Item>,
  cache: RD.RemoteData<HttpErrorString, Item[]>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToPrevOverallDataHandler<Item, Parent, ItemMsg>(
            config,
            m,
            cache.value,
          )
        : m
    return [
      newModel,
      getMorePrevDataFromApiCmd<Item, ItemMsg, Route>(
        networkStatus,
        dataSourceId,
        endpoint,
        cache,
        m.mode.overallData.value,
        newModel,
      ),
    ]
  } else return [m, Cmd.none()]
}

export const getMorePrevDataFromApiResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  overallDataBeforeCache: Item[],
  result: E.Either<HttpErrorString, Item[]>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    if (result._tag === 'Left') {
      return [
        {
          ...m,
          mode: {
            ...m.mode,
            // An end found exhausted meanwhile stays so
            prev:
              m.mode.prev._tag === 'Exhausted'
                ? m.mode.prev
                : { _tag: 'Failed', error: result.left },
          },
        },
        Cmd.none(),
      ]
    } else {
      const incomingData = result.right
      const newModel = addToPrevOverallDataHandler<Item, Parent, ItemMsg>(
        config,
        m,
        incomingData,
      )

      const uniqueIncomingData = pipe(
        incomingData,
        A.filter(
          (el) => !pipe(overallDataBeforeCache, A.elem(keyEq(config))(el)),
        ),
      )

      const isMax = uniqueIncomingData.length === 0

      return [
        {
          ...newModel,
          mode: {
            ...newModel.mode,
            // An end found exhausted meanwhile (the first page's API
            // answer) stays so
            prev:
              isMax || m.mode.prev._tag === 'Exhausted'
                ? { _tag: 'Exhausted' }
                : { _tag: 'Idle' },
          },
        },
        Cmd.none(),
      ]
    }
  } else return [m, Cmd.none()]
}

export const getMoreNextDataHandler = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  model: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  // An end that failed loads again: a retry
  if (
    canLoad(model.mode.next) &&
    model.mode.initial._tag === 'Loaded' &&
    model.mode.overallData.value.length !== 0
  ) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        next: { _tag: 'Loading' },
      },
    } satisfies Model<Item>
    const { cache, endpoint } = model.mode.nextHandler(
      model.mode.overallData.value,
    )(model.mode.nextSize)
    return [
      newModel,
      getMoreNextDataFromCacheCmd<Item, ItemMsg, Route>(
        networkStatus,
        model.mode.dataSourceId,
        cache,
        endpoint,
        newModel,
      ),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

export const getMoreNextDataFromCacheResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  networkStatus: boolean,
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  endpoint: EndpointHandler<Item>,
  cache: RD.RemoteData<HttpErrorString, Item[]>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToNextOverallDataHandler<Item, Parent, ItemMsg>(
            config,
            m,
            cache.value,
          )
        : m
    return [
      newModel,
      getMoreNextDataFromApiCmd<Item, ItemMsg, Route>(
        networkStatus,
        dataSourceId,
        endpoint,
        cache,
        m.mode.overallData.value,
        newModel,
      ),
    ]
  } else return [m, Cmd.none()]
}

export const getMoreNextDataFromApiResponseHandler = <
  Item,
  Parent,
  ItemMsg,
  Route,
>(
  config: LogicConfig<Item, Parent, ItemMsg>,
  dataSourceId: string,
  overallDataBeforeCache: Item[],
  result: E.Either<HttpErrorString, Item[]>,
  m: Model<Item>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    if (result._tag === 'Left') {
      return [
        {
          ...m,
          mode: {
            ...m.mode,
            // An end found exhausted meanwhile stays so
            next:
              m.mode.next._tag === 'Exhausted'
                ? m.mode.next
                : { _tag: 'Failed', error: result.left },
          },
        },
        Cmd.none(),
      ]
    } else {
      const incomingData = result.right
      const newModel = addToNextOverallDataHandler<Item, Parent, ItemMsg>(
        config,
        m,
        incomingData,
      )

      const currentSelectedKey = m.mode.selectedKey

      const incomingNext = pipe(
        incomingData,
        A.filter((el) => config.uniqueKeyField(el) !== currentSelectedKey),
      )

      const uniqueIncomingData = pipe(
        incomingNext,
        A.filter(
          (el) => !pipe(overallDataBeforeCache, A.elem(keyEq(config))(el)),
        ),
      )

      const isMax = uniqueIncomingData.length === 0

      return [
        {
          ...newModel,
          mode: {
            ...newModel.mode,
            // An end found exhausted meanwhile (the first page's API
            // answer) stays so
            next:
              isMax || m.mode.next._tag === 'Exhausted'
                ? { _tag: 'Exhausted' }
                : { _tag: 'Idle' },
          },
        },
        Cmd.none(),
      ]
    }
  } else return [m, Cmd.none()]
}

export const getMorePrevDataFromCacheCmd = <Item, ItemMsg, Route>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<Item[]>>,
  endpoint: EndpointHandler<Item>,
  _model: Model<Item>,
): Cmd<Msg<Item, ItemMsg, Route>> => {
  return cmdFromPromise(
    async () => {
      const cacheResult = (await cache()).data
      return pipe(cacheResult, RD.mapLeft(mkHttpError))
    },
    (r) => {
      if (r.tag === 'Ok')
        return {
          _tag: 'GetMorePrevDataFromCacheResponse',
          dataSourceId,
          endpoint,
          cache: r.value,
        } satisfies Msg<Item, ItemMsg, Route>
      // A cache that can't be read is no cache: the API request still runs.
      else
        return {
          _tag: 'GetMorePrevDataFromCacheResponse',
          dataSourceId,
          endpoint,
          cache: RD.failure(mkHttpError(errorToString(r.err))),
        } satisfies Msg<Item, ItemMsg, Route>
    },
  )
}

export const getMorePrevDataFromApiCmd = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<Item>,
  cacheRD: RD.RemoteData<HttpErrorString, Item[]>,
  overallDataBeforeCache: Item[],
  _model: Model<Item>,
): Cmd<Msg<Item, ItemMsg, Route>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return runEndpoint(
    'getMorePrevDataFromApiCmd',
    endpoint(networkStatus, cacheData),
    (result) =>
      ({
        _tag: 'GetMorePrevDataFromApiResponse',
        dataSourceId,
        overallDataBeforeCache,
        result,
      }) satisfies Msg<Item, ItemMsg, Route>,
  )
}

export const getMoreNextDataFromCacheCmd = <Item, ItemMsg, Route>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<Item[]>>,
  endpoint: EndpointHandler<Item>,
  _model: Model<Item>,
): Cmd<Msg<Item, ItemMsg, Route>> => {
  return cmdFromPromise(
    async () => {
      const cacheResult = (await cache()).data
      return pipe(cacheResult, RD.mapLeft(mkHttpError))
    },
    (r) => {
      if (r.tag === 'Ok')
        return {
          _tag: 'GetMoreNextDataFromCacheResponse',
          dataSourceId,
          endpoint,
          cache: r.value,
        } satisfies Msg<Item, ItemMsg, Route>
      // A cache that can't be read is no cache: the API request still runs.
      else
        return {
          _tag: 'GetMoreNextDataFromCacheResponse',
          dataSourceId,
          endpoint,
          cache: RD.failure(mkHttpError(errorToString(r.err))),
        } satisfies Msg<Item, ItemMsg, Route>
    },
  )
}

export const getMoreNextDataFromApiCmd = <Item, ItemMsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<Item>,
  cacheRD: RD.RemoteData<HttpErrorString, Item[]>,
  overallDataBeforeCache: Item[],
  _model: Model<Item>,
): Cmd<Msg<Item, ItemMsg, Route>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return runEndpoint(
    'getMoreNextDataFromApiCmd',
    endpoint(networkStatus, cacheData),
    (result) =>
      ({
        _tag: 'GetMoreNextDataFromApiResponse',
        dataSourceId,
        overallDataBeforeCache,
        result,
      }) satisfies Msg<Item, ItemMsg, Route>,
  )
}
