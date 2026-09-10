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
  attemptTE,
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
import { identity, pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  type ContainerChangeEvent,
  type EndpointHandler,
  type InitialEndpointResponse,
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
  isAEqual,
  removeElFromArray,
  replaceFuncActionHandler,
  replaceFuncActionHandlerAsync,
  revertPrevIsMax,
} from './util'

/**
 * Loads the initial page of data for a freshly mounted list.
 *
 * Backs the `GetInitialData` message and is invoked internally by `init()`.
 * It always resets `initialScrollDone` to `false` and blanks `initialData`
 * to `RD.pending`, since a new mount has no committed scroll position and
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
  <A, amsg, Route>(model: Model<A>): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
    const currentDataSourceId = model.mode.dataSourceId
    const newModel = {
      ...model,
      initialScrollDone: false,
      mode: {
        ...model.mode,
        initialData: RD.pending,
      },
    } satisfies Model<A>
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
 * - If data is already loaded (`overallData` is non-empty), `initialData`
 *   is left untouched so the list stays visible; only the underlying data
 *   is re-fetched in the background.
 * - If no data is loaded yet, `initialData` is set to `RD.pending`, same as
 *   a fresh load.
 * - `initialScrollDone` is never modified. The one-time initial scroll for
 *   this mount was already resolved (or intentionally was not owed), and a
 *   background refresh must not re-trigger it.
 *
 * For the initial load of a newly mounted list, dispatch `GetInitialData`
 * (handled by {@link getInitialDataHandler}) instead.
 */
export const refreshInitialDataHandler =
  (networkStatus: boolean) =>
  <A, amsg, Route>(model: Model<A>): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
    const currentDataSourceId = model.mode.dataSourceId
    const hasData = model.mode.overallData.value.length !== 0
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        initialData: hasData ? model.mode.initialData : RD.pending,
      },
    } satisfies Model<A>
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
 * newest unread item. Until the API leg has responded, `selectedKey` should
 * be treated as provisional: the cache leg may scroll only to a target the
 * API leg cannot later override (i.e. when `selectedKey` is `null`, meaning
 * the view opens at the newest page). Otherwise the cache leg could scroll
 * to a position the API leg immediately scrolls away from.
 *
 * Note: this deliberately does not set `invisWhileScrolling` while the
 * cache leg defers scrolling to the API leg. `invisWhileScrolling` is
 * cleared only by `ScrollToCurrentDone`, which is dispatched as part of a
 * scroll; setting it here without a corresponding scroll on this leg would
 * leave the list hidden indefinitely instead of simply skipping the scroll.
 */
export const getInitialDataFromCacheResponseHandler = <A, B, amsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  cache: RD.RemoteData<HttpErrorString, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const hasCacheData =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
    const newModel = hasCacheData
      ? pipe({
          ...m,
          mode: {
            ...m.mode,
            initialData: RD.success(cache.value),
            overallData: pipe(
              cache.value,
              SUA.fromArray(config.eqWithKey, config.ord),
            ),
          },
        } satisfies Model<A>)
      : m

    // Fast path: the cache leg may scroll only to a target the API leg cannot overturn
    // (no selectedKey: opening at newest page / end of list)
    const shouldScroll =
      !newModel.initialScrollDone &&
      hasCacheData &&
      newModel.mode.selectedKey === null

    return pipe(
      [
        shouldScroll ? { ...newModel, initialScrollDone: true } : newModel,
        getInitialDataFromApiCmd(networkStatus, newModel),
      ] satisfies [Model<A>, Cmd<Msg<A, amsg, Route>>],
      shouldScroll
        ? updateAndCmd(scrollToCurrentHandler(config, { isGraceful: false }))
        : identity,
    )
  } else return [m, Cmd.none()]
}

// Handle api resposne
export const getInitialDataFromApiResponseHandler = <A, B, amsg, Route>(
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  result: E.Either<HttpErrorString, InitialEndpointResponse<A>>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    // Cache is saved to overallData, so we can just check that
    const cacheExist = m.mode.overallData.value.length > 0

    const newModel = (() => {
      if (result._tag === 'Left') {
        return cacheExist
          ? { ...m, initialScrollDone: true }
          : ({
              ...m,
              initialScrollDone: true,
              mode: { ...m.mode, initialData: RD.failure(result.left) },
            } satisfies Model<A>)
      }
      if (result._tag === 'Right') {
        // We pass current overall data to ensure that, transformation func
        // in the config has access to latest overall data (which is populated
        // by cache initiall)
        const newOverallData = result.right.dataF(m.mode.overallData.value)
        return pipe({
          ...m,
          initialScrollDone: true,
          mode: {
            ...m.mode,
            initialData: RD.success(newOverallData),
            nextIsMax: result.right.nextIsMax,
            selectedKey:
              result.right.selectedKey === undefined
                ? m.mode.selectedKey
                : result.right.selectedKey,
            overallData: pipe(
              newOverallData,
              SUA.fromArray(config.eqWithKey, config.ord),
            ),
          },
        } satisfies Model<A>)
      } else return m
    })()

    // Scroll here unless the cache leg already did. This is the leg that
    // resolves the final target, since the API response may have reassigned
    // or cleared `selectedKey` after the cache leg ran — so it is the last
    // opportunity to scroll for this mount. Once `initialScrollDone` is
    // `true`, it is also what prevents a later refresh (via
    // `refreshInitialDataHandler`) from moving the view again.
    const shouldScroll = !m.initialScrollDone

    return pipe(
      newModel,
      shouldScroll
        ? scrollToCurrentHandler(config, { isGraceful: false })
        : (m) => [m, Cmd.none()],
    )
  } else return [m, Cmd.none()]
}

export const setNewSelectedKeyHandler = <A, B, amsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  msg: {
    dataSourceId: string
    selectedKey: string | null
    triggerScrollToCurrent?: ScrollToCurrentParam
    shouldReload?: true
  },
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (msg.dataSourceId === model.mode.dataSourceId) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        selectedKey: msg.selectedKey,
      },
    } satisfies Model<A>

    return pipe(
      newModel,
      // `shouldReload` here means the mounted list's TARGET is changing (a
      // new `selectedKey`), which is a genuine re-resolution — closer to
      // `init()` than to a same-target refresh — so this intentionally calls
      // `getInitialDataHandler`, not `refreshInitialDataHandler`, even though
      // no live call site sets `shouldReload` today.
      msg.shouldReload
        ? getInitialDataHandler(networkStatus)
        : (m) => [m, Cmd.none()] satisfies [Model<A>, Cmd<Msg<A, amsg, Route>>],
      msg.triggerScrollToCurrent
        ? updateAndCmd(
            scrollToCurrentHandler(config, msg.triggerScrollToCurrent),
          )
        : identity<[Model<A>, Cmd<Msg<A, amsg, Route>>]>,
    )
  } else return [model, Cmd.none()]
}

export const setModeAndAddUpdateDataHandler = <A, B, amsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  msg: {
    mode: Mode<A>
    data: A | null // new data to be added right after changing the mode (mainly used by SSE)
    shouldReload?: true
    onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => void
    shouldRestoreScrollState?: ShouldRestoreScrollStateArg
  },
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  const [resultState, containerChangeEvent] = pipe(
    {
      ...model,
      mode: { ...msg.mode },
    },
    (st) =>
      msg.data
        ? addOrUpdateData(config, msg.data, null)(st)
        : [st, { _tag: 'NoChange' } as ContainerChangeEvent],
  )
  return pipe(
    [
      {
        ...resultState,
        containerChangeEvent,
        onContainerScroll: msg.onContainerScroll,
        shouldRestoreScrollState: msg.shouldRestoreScrollState,
      },
      Cmd.none(),
    ] satisfies [Model<A>, Cmd<Msg<A, amsg, Route>>],
    // `shouldReload` here means a whole new `mode` is being installed — again
    // a genuine re-resolution of the target, not a refresh of the current
    // one — so this intentionally calls `getInitialDataHandler`, not
    // `refreshInitialDataHandler`, even though no live call site sets
    // `shouldReload` today.
    msg.shouldReload
      ? updateAndCmd<Msg<A, amsg, Route>, Model<A>>(
          getInitialDataHandler(networkStatus),
        )
      : identity,
  )
}

export const scrollToNewestHandler = <A, amsg, Route>(
  refs: Refs,
  isReversed: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  return [
    model,
    cmdSucceed(() => {
      if (refs.containerRef.current) {
        const container = refs.containerRef.current
        const targetScroll = isReversed ? container.scrollHeight : 0
        refs.currentScrollPosRef.current = targetScroll
        container.scroll({ top: targetScroll, behavior: 'smooth' })
      }
    }),
  ]
}

export const scrollToKeyHandler = <A, amsg, Route>(
  refs: Refs,
  model: Model<A>,
  itemKey: string,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
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

export const forceScrollToHandler = <A, amsg, Route>(
  refs: Refs,
  model: Model<A>,
  msg: { top: number },
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  return [
    { ...model, invisWhileScrolling: true },
    cmdSucceedWithMsg(
      () => {
        if (refs.containerRef.current) {
          const newTop = msg.top
          const container = refs.containerRef.current
          container.scrollTo({ top: newTop })
          refs.currentScrollPosRef.current = newTop
          refs.currentScrollHeightRef.current = container.scrollHeight
        }
      },
      () =>
        ({
          _tag: 'SetInvisWhileScrolling',
          dataSourceId: model.mode.dataSourceId,
          value: false,
        }) satisfies Msg<A, amsg, Route>,
    ),
  ]
}

export const replaceFuncHandler = <A, Route>(
  model: Model<A>,
  msg: {
    func: (
      a: SortedUniqueArray<A>,
    ) => [SortedUniqueArray<A>, AppRouteUpdater<Route>]
    containerChangeEvent?: ContainerChangeEvent
  },
): [Model<A>, AppRouteUpdater<Route>] => {
  const [newModel, routeUpdater] = replaceFuncActionHandler(model, msg.func)
  return [
    {
      ...newModel,
      containerChangeEvent:
        msg.containerChangeEvent ?? model.containerChangeEvent,
    },
    routeUpdater,
  ]
}

export const mapFuncHandler = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  msg: {
    func: (a: A) => A
    containerChangeEvent?: ContainerChangeEvent
  },
): Model<A> => {
  const [newModel, _r] = replaceFuncActionHandler(model, (as) => [
    SUA.map(config.eqWithKey, config.ord)(msg.func)(as),
    null,
  ])
  return {
    ...newModel,
    containerChangeEvent:
      msg.containerChangeEvent ?? model.containerChangeEvent,
  }
}

export const addOrUpdateDataHandler = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  msg: {
    dataSourceId: string
    value: { data: A; previousId: string | null }[]
    compareId: (a: A, b: string) => boolean
  },
): Model<A> => {
  if (msg.dataSourceId === model.mode.dataSourceId) {
    // console.log(
    //   '[MSG_STATE][reducer] AddOrUpdateData msg received:',
    //   msg.value,
    // )

    const [resultState, resultCurrentTopElementChange] = pipe(
      msg.value,
      A.reduce([model, 0] as [Model<A>, number], (acc, el) => {
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

    return revertPrevIsMax({
      ...resultState,
      containerChangeEvent,
    })
  } else return model
}

// -------------------------------------------------------------
// Cmd
// -------------------------------------------------------------

export const getInitialDataFromCacheCmd = <A, amsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
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
        } satisfies Msg<A, amsg, Route>
      else {
        console.warn(
          'Error from func: getInitialDataFromCacheCmd: ' +
            errorToString(r.err),
        )
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getInitialDataFromApiCmd = <A, amsg, Route>(
  networkStatus: boolean,
  model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
  const { endpoint } = model.mode.initialHandler()

  // We can access cache via current overallData since it is
  // populated with the cache value anyway.
  const cacheData = model.mode.overallData.value

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetInitialDataFromApiResponse',
          dataSourceId: model.mode.dataSourceId,
          result: E.right(r.value),
        } satisfies Msg<A, amsg, Route>
      case 'Err': {
        console.warn(
          'Error from func: getInitialDataFromCacheCmd: ' +
            errorToString(r.err),
        )
        return { _tag: 'NoOp' }
      }
    }
  })
}

export const replaceFuncAsyncCmd = <A, amsg, Route>(
  model: Model<A>,
  msg: {
    func: (
      a: SortedUniqueArray<A>,
    ) => Promise<[SortedUniqueArray<A>, AppRouteUpdater<Route>]>
    containerChangeEvent?: ContainerChangeEvent
  },
): Cmd<Msg<A, amsg, Route>> => {
  return cmdFromPromise(
    async () => {
      const newState = await replaceFuncActionHandlerAsync(model, msg.func)
      return newState
    },
    (r) => {
      if (r.tag === 'Ok')
        return {
          _tag: 'SetState',
          value: {
            ...r.value[0],
            containerChangeEvent:
              msg.containerChangeEvent ?? model.containerChangeEvent,
          },
          routeUpdater: r.value[1],
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
  <A, B, amsg, Route>(
    logicConfig: LogicConfig<A, B, amsg>,
    param: ScrollToCurrentParam,
  ) =>
  (model: Model<A>): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
    const containerRef = logicConfig.refs.containerRef

    if (param.isSearching) {
      return checkVisibleAndScrollToCurrent({ logicConfig, model, param })
    }

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
            restore(model.mode.dataSourceId, containerRefCurrent),
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

export const checkVisibleAndScrollToCurrent = <A, B, amsg, Route>(args: {
  logicConfig: LogicConfig<A, B, amsg>
  model: Model<A>
  param: ScrollToCurrentParam
  elementId?: string
  customScrollToCurrent?: () => void
}): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  const { logicConfig, model, param, elementId, customScrollToCurrent } = args

  const containerRef = logicConfig.refs.containerRef
  const itemRefs = logicConfig.refs.itemRefs
  const currentScrollHeightRef = logicConfig.refs.currentScrollHeightRef
  const currentScrollPosRef = logicConfig.refs.currentScrollPosRef

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

      console.log('oldest', refToScrollTo.id)
      // Scroll to currentRef
      console.log('inView', inView)

      if (param.isSearching && containerRef.current) {
        // TODO: debugging purpose
        // const elementTop = refToScrollTo.offsetTop

        // const offsetTop = elementTop - 95 // searchbar height

        return requestAnimationFrame(() => {
          if (!containerRef.current) return
          containerRef.current.scrollTo()
        })
      }

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
      invisWhileScrolling:
        param.isGraceful === false ? true : model.invisWhileScrolling,

      // Set is scroll to true if it is not already in scrolling
      isScrolling: model.isScrolling === false ? true : model.isScrolling,
    },
    cmdFromPromise(
      async () => {
        // This needed when we try to run `restore` func from scroll state map
        if (customScrollToCurrent) customScrollToCurrent()
        else await scrollToCurrent()

        // Record scroll pos and height
        // Note: we have to use `setTimeout` since the `containerRef.current.scrollTop`
        // is smaller than the actual scrollTop for some reason.
        setTimeout(() => {
          if (containerRef.current) {
            currentScrollPosRef.current = containerRef.current.scrollTop
            currentScrollHeightRef.current = containerRef.current.scrollHeight

            // Record the new scroll state into scroll_state map
            if (model.onContainerScroll)
              model.onContainerScroll(
                model.mode.dataSourceId,
                containerRef.current,
              )
          }
        }, 500)
      },

      () => ({
        _tag: 'ScrollToCurrentDone',
        param,
        dataSourceId: model.mode.dataSourceId,
      }),
      // () => ({ _tag: 'None' })
    ),
  ]
}

export const addToPrevOverallDataHandler = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  value: A[],
): Model<A> => {
  const overallData = pipe(
    model.mode.overallData,
    SUA.concat(config.eqWithKey, config.ord)(value),
  )

  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    value,
    model.mode.overallData.value,
  )

  return {
    ...model,
    mode: {
      ...model.mode,
      overallData,
    },
    containerChangeEvent:
      uniqueIncomingData.length > 0 && config.isReversed
        ? ({ _tag: 'ElementModifyOnTop' } as ContainerChangeEvent)
        : ({ _tag: 'NoChange' } as ContainerChangeEvent),
  } satisfies Model<A>
}

export const addToNextOverallDataHandler = <A, B, amsg>(
  config: LogicConfig<A, B, amsg>,
  model: Model<A>,
  value: A[],
): Model<A> => {
  const overallData = pipe(
    model.mode.overallData,
    SUA.concat(config.eqWithKey, config.ord)(value),
  )

  const currentDataI = pipe(
    overallData,
    SUA.findIndex((a) => config.uniqueKeyField(a) === model.mode.selectedKey),
  )
  const incomingNext =
    currentDataI >= 0
      ? removeElFromArray(config, overallData.value[currentDataI], value)
      : value

  const uniqueIncomingData = filterUnique(
    isAEqual(config),
    incomingNext,
    model.mode.overallData.value,
  )

  return {
    ...model,
    mode: {
      ...model.mode,
      overallData,
    },
    containerChangeEvent:
      uniqueIncomingData.length > 0 && !config.isReversed
        ? ({ _tag: 'ElementModifyOnTop' } as ContainerChangeEvent)
        : ({ _tag: 'NoChange' } as ContainerChangeEvent),
  } satisfies Model<A>
}

export const getMorePrevDataHandler = <A, amsg, Route>(
  networkStatus: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (
    (model.mode.prevData._tag === 'RemoteSuccess' ||
      model.mode.prevData._tag === 'RemoteInitial') &&
    model.mode.initialData._tag === 'RemoteSuccess' &&
    model.mode.overallData.value.length !== 0
  ) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        prevData: RD.pending,
      },
    } satisfies Model<A>
    const { cache, endpoint } = model.mode.prevHandler(
      model.mode.overallData.value,
    )(model.mode.prevSize)
    return [
      newModel,
      getMorePrevDataFromCacheCmd<A, amsg, Route>(
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

export const getMorePrevDataFromCacheResponseHandler = <A, B, amsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cache: RD.RemoteData<HttpErrorString, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToPrevOverallDataHandler<A, B, amsg>(config, m, cache.value)
        : m
    return [
      newModel,
      getMorePrevDataFromApiCmd<A, amsg, Route>(
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

export const getMorePrevDataFromApiResponseHandler = <A, B, amsg, Route>(
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  overallDataBeforeCache: A[],
  result: E.Either<HttpErrorString, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    if (result._tag === 'Left') {
      return [
        {
          ...m,
          mode: {
            ...m.mode,
            prevData: RD.failure(result.left),
          },
        },
        Cmd.none(),
      ]
    } else {
      const incomingData = result.right
      const newModel = addToPrevOverallDataHandler<A, B, amsg>(
        config,
        m,
        incomingData,
      )

      const uniqueIncomingData = pipe(
        incomingData,
        A.filter(
          (el) => !pipe(overallDataBeforeCache, A.elem(config.eqWithKey)(el)),
        ),
      )

      const isMax = uniqueIncomingData.length === 0

      return [
        {
          ...newModel,
          mode: {
            ...newModel.mode,
            prevData: RD.success(incomingData),
            prevIsMax: isMax || m.mode.prevIsMax,
          },
        },
        Cmd.none(),
      ]
    }
  } else return [m, Cmd.none()]
}

export const getMoreNextDataHandler = <A, amsg, Route>(
  networkStatus: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (
    (model.mode.nextData._tag === 'RemoteSuccess' ||
      model.mode.nextData._tag === 'RemoteInitial') &&
    model.mode.initialData._tag === 'RemoteSuccess' &&
    model.mode.overallData.value.length !== 0
  ) {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        nextData: RD.pending,
      },
    } satisfies Model<A>
    const { cache, endpoint } = model.mode.nextHandler(
      model.mode.overallData.value,
    )(model.mode.nextSize)
    return [
      newModel,
      getMoreNextDataFromCacheCmd<A, amsg, Route>(
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

export const getMoreNextDataFromCacheResponseHandler = <A, B, amsg, Route>(
  networkStatus: boolean,
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cache: RD.RemoteData<HttpErrorString, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToNextOverallDataHandler<A, B, amsg>(config, m, cache.value)
        : m
    return [
      newModel,
      getMoreNextDataFromApiCmd<A, amsg, Route>(
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

export const getMoreNextDataFromApiResponseHandler = <A, B, amsg, Route>(
  config: LogicConfig<A, B, amsg>,
  dataSourceId: string,
  overallDataBeforeCache: A[],
  result: E.Either<HttpErrorString, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    if (result._tag === 'Left') {
      return [
        {
          ...m,
          mode: {
            ...m.mode,
            nextData: RD.failure(result.left),
          },
        },
        Cmd.none(),
      ]
    } else {
      const incomingData = result.right
      const newModel = addToNextOverallDataHandler<A, B, amsg>(
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
          (el) => !pipe(overallDataBeforeCache, A.elem(config.eqWithKey)(el)),
        ),
      )

      const isMax = uniqueIncomingData.length === 0

      return [
        {
          ...newModel,
          mode: {
            ...newModel.mode,
            nextData: RD.success(incomingData),
            nextIsMax: isMax || m.mode.nextIsMax,
          },
        },
        Cmd.none(),
      ]
    }
  } else return [m, Cmd.none()]
}

export const getMorePrevDataFromCacheCmd = <A, amsg, Route>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<A[]>>,
  endpoint: EndpointHandler<A>,
  _model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
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
        } satisfies Msg<A, amsg, Route>
      else {
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getMorePrevDataFromApiCmd = <A, amsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cacheRD: RD.RemoteData<HttpErrorString, A[]>,
  overallDataBeforeCache: A[],
  _model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetMorePrevDataFromApiResponse',
          dataSourceId,
          overallDataBeforeCache,
          result: E.right(r.value),
        } satisfies Msg<A, amsg, Route>
      case 'Err': {
        return {
          _tag: 'GetMorePrevDataFromApiResponse',
          dataSourceId,
          overallDataBeforeCache,
          result: E.left(mkHttpError(errorToString(r.err))),
        } satisfies Msg<A, amsg, Route>
      }
    }
  })
}

export const getMoreNextDataFromCacheCmd = <A, amsg, Route>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<A[]>>,
  endpoint: EndpointHandler<A>,
  _model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
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
        } satisfies Msg<A, amsg, Route>
      else {
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getMoreNextDataFromApiCmd = <A, amsg, Route>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cacheRD: RD.RemoteData<HttpErrorString, A[]>,
  overallDataBeforeCache: A[],
  _model: Model<A>,
): Cmd<Msg<A, amsg, Route>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetMoreNextDataFromApiResponse',
          dataSourceId,
          overallDataBeforeCache,
          result: E.right(r.value),
        } satisfies Msg<A, amsg, Route>
      case 'Err': {
        return {
          _tag: 'GetMoreNextDataFromApiResponse',
          dataSourceId,
          overallDataBeforeCache,
          result: E.left(mkHttpError(errorToString(r.err))),
        } satisfies Msg<A, amsg, Route>
      }
    }
  })
}
