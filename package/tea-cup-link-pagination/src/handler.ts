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
} from './type'
import type * as CacheData from './type/cache-data'
import { restoreScrollState, storeScrollState } from './type/scroll-state'
import * as SUA from './type/sorted-unique-array'
import { type SortedUniqueArray } from './type/sorted-unique-array'
import {
  addOrUpdateData,
  isAEqual,
  removeElFromArray,
  replaceFuncActionHandler,
  revertPrevIsMax,
} from './util'

export const getInitialDataHandler =
  (networkStatus: boolean, dataSourceId: string) =>
  <A, ItemMsg = never>(model: Model<A>): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
    const newModel = {
      ...model,
      mode: {
        ...model.mode,
        initialData: RD.pending,
      },
    } satisfies Model<A>
    return [
      newModel,
      getInitialDataFromCacheCmd<A, ItemMsg>(
        networkStatus,
        dataSourceId,
        newModel,
      ),
    ]
  }

export const getInitialDataFromCacheResponseHandler = <A, ItemMsg>(
  networkStatus: boolean,
  config: LogicConfig<A>,
  dataSourceId: string,
  cache: RD.RemoteData<string, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
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
    return pipe(
      [newModel, getInitialDataFromApiCmd(networkStatus, newModel)] satisfies [
        Model<A>,
        Cmd<Msg<A, ItemMsg>>,
      ],
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? updateAndCmd(scrollToCurrentHandler(config, { isGraceful: false }))
        : identity,
    )
  } else {
    return [m, Cmd.none()]
  }
}

export const getInitialDataFromApiResponseHandler = <A, ItemMsg>(
  config: LogicConfig<A>,
  dataSourceId: string,
  result: E.Either<string, InitialEndpointResponse<A>>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    // Cache is saved to overallData, so we can just check that
    const cacheExist = m.mode.overallData.value.length > 0

    const newModel = (() => {
      if (result._tag === 'Right') {
        const newOverallData = result.right.dataF(m.mode.overallData.value)
        return pipe({
          ...m,
          mode: {
            ...m.mode,
            initialData: RD.success(newOverallData),
            nextIsMax: result.right.nextIsMax,
            overallData: pipe(
              newOverallData,
              SUA.fromArray(config.eqWithKey, config.ord),
            ),
          },
        } satisfies Model<A>)
      } else {
        return m
      }
    })()

    return pipe(
      newModel,
      // If cache already exists, maintain existing reading position
      cacheExist
        ? (model) =>
            [model, Cmd.none()] satisfies [Model<A>, Cmd<Msg<A, ItemMsg>>]
        : scrollToCurrentHandler(config, { isGraceful: false }),
    )
  } else {
    return [m, Cmd.none()]
  }
}

export const setNewSelectedKeyHandler = <A, ItemMsg>(
  networkStatus: boolean,
  config: LogicConfig<A>,
  model: Model<A>,
  msg: {
    dataSourceId: string
    selectedKey: string | null
    triggerScrollToCurrent?: ScrollToCurrentParam
    shouldReload?: true
  },
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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
      msg.shouldReload
        ? getInitialDataHandler(networkStatus, msg.dataSourceId)
        : (m) => [m, Cmd.none()] satisfies [Model<A>, Cmd<Msg<A, ItemMsg>>],
      msg.triggerScrollToCurrent
        ? updateAndCmd(
            scrollToCurrentHandler(config, msg.triggerScrollToCurrent),
          )
        : identity<[Model<A>, Cmd<Msg<A, ItemMsg>>]>,
    )
  } else {
    return [model, Cmd.none()]
  }
}

export const setModeAndAddUpdateDataHandler = <A, ItemMsg>(
  networkStatus: boolean,
  config: LogicConfig<A>,
  model: Model<A>,
  msg: {
    mode: Mode<A>
    data: A | null
    shouldReload?: true
  },
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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
      },
      Cmd.none(),
    ] satisfies [Model<A>, Cmd<Msg<A, ItemMsg>>],
    msg.shouldReload
      ? updateAndCmd<Msg<A, ItemMsg>, Model<A>>(
          getInitialDataHandler(networkStatus, msg.mode.dataSourceId),
        )
      : identity,
  )
}

export const scrollToNewestHandler = <A, ItemMsg>(
  refs: Refs,
  isReversed: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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

export const scrollToKeyHandler = <A, ItemMsg>(
  refs: Refs,
  model: Model<A>,
  key: string,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  return [
    model,
    cmdSucceed(() => {
      const element = refs.itemRefs.current[key]
      if (!element) {
        return
      }
      requestAnimationFrame(() => {
        if (!refs.containerRef.current) return
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }),
  ]
}

export const forceScrollToHandler = <A, ItemMsg>(
  refs: Refs,
  model: Model<A>,
  msg: { top: number },
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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
        }) satisfies Msg<A, ItemMsg>,
    ),
  ]
}

export const replaceFuncHandler = <A>(
  model: Model<A>,
  msg: {
    func: (a: SortedUniqueArray<A>) => SortedUniqueArray<A>
    containerChangeEvent?: ContainerChangeEvent
  },
): Model<A> => {
  const newModel = replaceFuncActionHandler(model, msg.func)
  return {
    ...newModel,
    containerChangeEvent:
      msg.containerChangeEvent ?? model.containerChangeEvent,
  }
}

export const mapFuncHandler = <A>(
  config: LogicConfig<A>,
  model: Model<A>,
  msg: {
    func: (a: A) => A
    containerChangeEvent?: ContainerChangeEvent
  },
): Model<A> => {
  const newModel = replaceFuncActionHandler(model, (as) =>
    SUA.map(config.eqWithKey, config.ord)(msg.func)(as),
  )
  return {
    ...newModel,
    containerChangeEvent:
      msg.containerChangeEvent ?? model.containerChangeEvent,
  }
}

export const addOrUpdateDataHandler = <A>(
  config: LogicConfig<A>,
  model: Model<A>,
  data: A,
  previousId: string | null = null,
  compareId: (a: A, b: string) => boolean = () => false,
): Model<A> => {
  const [resultState, elementChange] = addOrUpdateData(
    config,
    data,
    previousId,
    compareId,
  )(model)

  return revertPrevIsMax({
    ...resultState,
    containerChangeEvent: elementChange,
  })
}

// -------------------------------------------------------------
// Cmd
// -------------------------------------------------------------

export const getInitialDataFromCacheCmd = <A, ItemMsg>(
  networkStatus: boolean,
  dataSourceId: string,
  model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  return cmdFromPromise(
    async () => {
      const { cache } = model.mode.initialHandler()
      const cacheResult = (await cache(networkStatus)).data
      return cacheResult
    },
    (r) => {
      if (r.tag === 'Ok') {
        return {
          _tag: 'GetInitialDataFromCacheResponse',
          dataSourceId,
          cache: r.value,
        } satisfies Msg<A, ItemMsg>
      } else {
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getInitialDataFromApiCmd = <A, ItemMsg>(
  networkStatus: boolean,
  model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  const { endpoint } = model.mode.initialHandler()
  const cacheData = model.mode.overallData.value

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetInitialDataFromApiResponse',
          dataSourceId: model.mode.dataSourceId,
          result: E.right(r.value),
        } satisfies Msg<A, ItemMsg>
      case 'Err':
        return {
          _tag: 'GetInitialDataFromApiResponse',
          dataSourceId: model.mode.dataSourceId,
          result: E.left(errorToString(r.err)),
        } satisfies Msg<A, ItemMsg>
    }
  })
}

export const scrollToCurrentHandler =
  <A, ItemMsg>(logicConfig: LogicConfig<A>, param: ScrollToCurrentParam) =>
  (model: Model<A>): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
    const containerRef = logicConfig.refs.containerRef

    if (param.isSearching) {
      return checkVisibleAndScrollToCurrent({ logicConfig, model, param })
    }

    if (logicConfig.scrollStateMap && containerRef.current) {
      const containerRefCurrent = containerRef.current
      const restored = restoreScrollState(logicConfig.scrollStateMap)(
        model.mode.dataSourceId,
        containerRefCurrent,
      )
      if (restored) {
        return [
          {
            ...model,
            invisWhileScrolling: false,
            isScrolling: false,
          },
          cmdSucceed(() => ({
            _tag: 'ScrollToCurrentDone' as const,
            param,
            dataSourceId: model.mode.dataSourceId,
          })),
        ]
      }
    }

    return checkVisibleAndScrollToCurrent({ logicConfig, model, param })
  }

const waitForImagesLoadUpToCertainElement = async (
  items: [string, HTMLElement | null][],
  key: string,
) => {
  const targetIndex = items.findIndex(([i]) => i === key)
  const itemsUpToKey =
    targetIndex >= 0 ? items.slice(0, targetIndex + 1) : items
  const promises: Promise<void>[] = itemsUpToKey.flatMap(([, element]) => {
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
  await Promise.all(promises)
}

export const checkVisibleAndScrollToCurrent = <A, ItemMsg>(args: {
  logicConfig: LogicConfig<A>
  model: Model<A>
  param: ScrollToCurrentParam
  elementId?: string
}): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  const { logicConfig, model, param, elementId } = args

  const containerRef = logicConfig.refs.containerRef
  const itemRefs = logicConfig.refs.itemRefs
  const currentScrollHeightRef = logicConfig.refs.currentScrollHeightRef
  const currentScrollPosRef = logicConfig.refs.currentScrollPosRef

  const isVisible = (domElement: Element): Promise<boolean> => {
    return new Promise((resolve) => {
      const o = new IntersectionObserver(([entry]) => {
        if (logicConfig.visibleStrategy._tag === 'HalfInView') {
          resolve(entry.intersectionRatio > 0.2)
        } else {
          resolve(entry.intersectionRatio === 1)
        }
        o.disconnect()
      })
      o.observe(domElement)
    })
  }

  const scrollToCurrent = async () => {
    const refToScrollTo = (() => {
      if (elementId && itemRefs.current[elementId]) {
        return itemRefs.current[elementId]
      } else if (
        !model.mode.selectedKey &&
        model.mode.overallData.value.length > 0
      ) {
        return itemRefs.current[
          logicConfig.uniqueKeyField(model.mode.overallData.value[0])
        ]
      } else if (model.mode.selectedKey) {
        return itemRefs.current[model.mode.selectedKey]
      }
      return null
    })()

    if (refToScrollTo) {
      await waitForImagesLoadUpToCertainElement(
        Object.entries(itemRefs.current),
        refToScrollTo.id,
      )

      const inView = await isVisible(refToScrollTo)

      if (param.isSearching && containerRef.current) {
        return requestAnimationFrame(() => {
          if (!containerRef.current) return
          refToScrollTo.scrollIntoView({ block: 'nearest' })
        })
      }

      if (!inView && containerRef.current) {
        if (logicConfig.visibleStrategy._tag === 'HalfInView') {
          refToScrollTo.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
          })
        } else {
          refToScrollTo.scrollIntoView()
        }
      }
    }
  }

  return [
    {
      ...model,
      invisWhileScrolling:
        param.isGraceful === false ? true : model.invisWhileScrolling,
      isScrolling: model.isScrolling === false ? true : model.isScrolling,
    },
    cmdFromPromise(
      async () => {
        await scrollToCurrent()

        setTimeout(() => {
          if (containerRef.current) {
            currentScrollPosRef.current = containerRef.current.scrollTop
            currentScrollHeightRef.current = containerRef.current.scrollHeight

            if (logicConfig.scrollStateMap) {
              storeScrollState(logicConfig.scrollStateMap)(
                model.mode.dataSourceId,
                containerRef.current,
              )
            }
          }
        }, 300)
      },
      () =>
        ({
          _tag: 'ScrollToCurrentDone',
          param,
          dataSourceId: model.mode.dataSourceId,
        }) satisfies Msg<A, ItemMsg>,
    ),
  ]
}

export const addToPrevOverallDataHandler = <A>(
  config: LogicConfig<A>,
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

export const addToNextOverallDataHandler = <A>(
  config: LogicConfig<A>,
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

export const getMorePrevDataHandler = <A, ItemMsg>(
  networkStatus: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (
    (model.mode.prevData._tag === 'RemoteSuccess' ||
      model.mode.prevData._tag === 'RemoteInitial') &&
    model.mode.initialData._tag === 'RemoteSuccess' &&
    model.mode.overallData.value.length !== 0 &&
    !model.mode.prevIsMax
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
      getMorePrevDataFromCacheCmd<A, ItemMsg>(
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

export const getMorePrevDataFromCacheResponseHandler = <A, ItemMsg>(
  networkStatus: boolean,
  config: LogicConfig<A>,
  dataSourceId: string,
  cache: RD.RemoteData<string, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToPrevOverallDataHandler<A>(config, m, cache.value)
        : m
    const { endpoint } = m.mode.prevHandler(m.mode.overallData.value)(
      m.mode.prevSize,
    )
    return [
      newModel,
      getMorePrevDataFromApiCmd<A, ItemMsg>(
        networkStatus,
        dataSourceId,
        endpoint,
        cache,
        m.mode.overallData.value,
        newModel,
      ),
    ]
  } else {
    return [m, Cmd.none()]
  }
}

export const getMorePrevDataFromApiResponseHandler = <A, ItemMsg>(
  config: LogicConfig<A>,
  dataSourceId: string,
  result: E.Either<string, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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
      const newModel = addToPrevOverallDataHandler<A>(config, m, incomingData)

      const isMax = incomingData.length < m.mode.prevSize.value

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
  } else {
    return [m, Cmd.none()]
  }
}

export const getMoreNextDataHandler = <A, ItemMsg>(
  networkStatus: boolean,
  model: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (
    (model.mode.nextData._tag === 'RemoteSuccess' ||
      model.mode.nextData._tag === 'RemoteInitial') &&
    model.mode.initialData._tag === 'RemoteSuccess' &&
    model.mode.overallData.value.length !== 0 &&
    !model.mode.nextIsMax
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
      getMoreNextDataFromCacheCmd<A, ItemMsg>(
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

export const getMoreNextDataFromCacheResponseHandler = <A, ItemMsg>(
  networkStatus: boolean,
  config: LogicConfig<A>,
  dataSourceId: string,
  cache: RD.RemoteData<string, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
  if (m.mode.dataSourceId === dataSourceId) {
    const newModel =
      cache._tag === 'RemoteSuccess' && cache.value.length !== 0
        ? addToNextOverallDataHandler<A>(config, m, cache.value)
        : m
    const { endpoint } = m.mode.nextHandler(m.mode.overallData.value)(
      m.mode.nextSize,
    )
    return [
      newModel,
      getMoreNextDataFromApiCmd<A, ItemMsg>(
        networkStatus,
        dataSourceId,
        endpoint,
        cache,
        m.mode.overallData.value,
        newModel,
      ),
    ]
  } else {
    return [m, Cmd.none()]
  }
}

export const getMoreNextDataFromApiResponseHandler = <A, ItemMsg>(
  config: LogicConfig<A>,
  dataSourceId: string,
  result: E.Either<string, A[]>,
  m: Model<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
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
      const newModel = addToNextOverallDataHandler<A>(config, m, incomingData)

      const isMax = incomingData.length < m.mode.nextSize.value

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
  } else {
    return [m, Cmd.none()]
  }
}

export const getMorePrevDataFromCacheCmd = <A, ItemMsg>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<A[]>>,
  _endpoint: EndpointHandler<A>,
  _model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  return cmdFromPromise(
    async () => {
      const cacheResult = (await cache()).data
      return cacheResult
    },
    (r) => {
      if (r.tag === 'Ok') {
        return {
          _tag: 'GetMorePrevDataFromCacheResponse',
          dataSourceId,
          cache: r.value,
        } satisfies Msg<A, ItemMsg>
      } else {
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getMorePrevDataFromApiCmd = <A, ItemMsg>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cacheRD: RD.RemoteData<string, A[]>,
  _overallDataBeforeCache: A[],
  _model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetMorePrevDataFromApiResponse',
          dataSourceId,
          result: E.right(r.value),
        } satisfies Msg<A, ItemMsg>
      case 'Err':
        return {
          _tag: 'GetMorePrevDataFromApiResponse',
          dataSourceId,
          result: E.left(errorToString(r.err)),
        } satisfies Msg<A, ItemMsg>
    }
  })
}

export const getMoreNextDataFromCacheCmd = <A, ItemMsg>(
  _networkStatus: boolean,
  dataSourceId: string,
  cache: () => Promise<CacheData.Type<A[]>>,
  _endpoint: EndpointHandler<A>,
  _model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  return cmdFromPromise(
    async () => {
      const cacheResult = (await cache()).data
      return cacheResult
    },
    (r) => {
      if (r.tag === 'Ok') {
        return {
          _tag: 'GetMoreNextDataFromCacheResponse',
          dataSourceId,
          cache: r.value,
        } satisfies Msg<A, ItemMsg>
      } else {
        return { _tag: 'NoOp' }
      }
    },
  )
}

export const getMoreNextDataFromApiCmd = <A, ItemMsg>(
  networkStatus: boolean,
  dataSourceId: string,
  endpoint: EndpointHandler<A>,
  cacheRD: RD.RemoteData<string, A[]>,
  _overallDataBeforeCache: A[],
  _model: Model<A>,
): Cmd<Msg<A, ItemMsg>> => {
  const cacheData = cacheRD._tag === 'RemoteSuccess' ? cacheRD.value : []

  return attemptTE(endpoint(networkStatus, cacheData), (r) => {
    switch (r.tag) {
      case 'Ok':
        return {
          _tag: 'GetMoreNextDataFromApiResponse',
          dataSourceId,
          result: E.right(r.value),
        } satisfies Msg<A, ItemMsg>
      case 'Err':
        return {
          _tag: 'GetMoreNextDataFromApiResponse',
          dataSourceId,
          result: E.left(errorToString(r.err)),
        } satisfies Msg<A, ItemMsg>
    }
  })
}
