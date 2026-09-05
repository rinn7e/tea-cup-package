import { Cmd } from 'tea-cup-fp'

import {
  forceScrollToHandler,
  getInitialDataFromApiResponseHandler,
  getInitialDataFromCacheResponseHandler,
  getInitialDataHandler,
  getMoreNextDataFromApiResponseHandler,
  getMoreNextDataFromCacheResponseHandler,
  getMoreNextDataHandler,
  getMorePrevDataFromApiResponseHandler,
  getMorePrevDataFromCacheResponseHandler,
  getMorePrevDataHandler,
  mapFuncHandler,
  replaceFuncHandler,
  scrollToKeyHandler,
  scrollToNewestHandler,
  setModeAndAddUpdateDataHandler,
  setNewSelectedKeyHandler,
} from './handler'
import {
  type ContainerChangeEvent,
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
  mkScrollStateMap,
} from './type'
import * as SUA from './type/sorted-unique-array'

// -------------------------------------------
// Init
// -------------------------------------------

export function init<A, ItemMsg>(
  networkStatus: boolean,
  mode: Mode<A>,
): [Model<A>, Cmd<Msg<A, ItemMsg>>] {
  const model: Model<A> = {
    mode,
    containerChangeEvent: { _tag: 'NoChange' },
    invisWhileScrolling: false,
    isScrolling: false,
    savedScrollPos: null,
    scrollStateMap: mkScrollStateMap(),
  }

  return getInitialDataHandler(
    networkStatus,
    model.mode.dataSourceId,
  )<A, ItemMsg>(model)
}

// -------------------------------------------
// Update Item Helper
// -------------------------------------------

export const updateItem =
  <A>(
    predicateOrKey: ((a: A) => boolean) | string,
    newItem: A,
    containerChangeEvent: ContainerChangeEvent = {
      _tag: 'ElementModifyInPlace',
    },
  ) =>
  (model: Model<A>): Model<A> => {
    const predicate =
      typeof predicateOrKey === 'string'
        ? (a: A) =>
            (a as any).id === predicateOrKey ||
            (a as any).key === predicateOrKey
        : predicateOrKey

    const idx = SUA.findIndex(predicate)(model.mode.overallData)
    if (idx >= 0) {
      return {
        ...model,
        mode: {
          ...model.mode,
          overallData: SUA.updateAtOrKeep(idx, newItem)(model.mode.overallData),
        },
        containerChangeEvent,
      }
    } else {
      return model
    }
  }

// -------------------------------------------
// Update
// -------------------------------------------

export const update =
  <A, ItemMsg>(networkStatus: boolean, config: LogicConfig<A>) =>
  (msg: Msg<A, ItemMsg>, model: Model<A>): [Model<A>, Cmd<Msg<A, ItemMsg>>] => {
    switch (msg._tag) {
      case 'NoOp':
        return [model, Cmd.none()]

      case 'ScrollToNewest':
        return scrollToNewestHandler(config.refs, config.isReversed, model)

      case 'ForceScrollTo':
        return forceScrollToHandler(config.refs, model, msg)

      case 'ScrollToKey':
        return scrollToKeyHandler(config.refs, model, msg.key)

      case 'SetModeAndAddUpdateData':
        return setModeAndAddUpdateDataHandler(networkStatus, config, model, msg)

      case 'SetNewSelectedKey':
        return setNewSelectedKeyHandler(networkStatus, config, model, msg)

      case 'SetContainerChangeEvent':
        return [
          {
            ...model,
            containerChangeEvent: msg.value,
          },
          Cmd.none(),
        ]

      case 'MapFunc':
        return [mapFuncHandler(config, model, msg), Cmd.none()]

      case 'ReplaceFunc':
        return [replaceFuncHandler(model, msg), Cmd.none()]

      case 'GetInitialData':
        return getInitialDataHandler(msg.networkStatus, msg.dataSourceId)(model)

      case 'GetInitialDataFromCacheResponse':
        return getInitialDataFromCacheResponseHandler(
          networkStatus,
          config,
          msg.dataSourceId,
          msg.cache,
          model,
        )

      case 'GetInitialDataFromApiResponse':
        return getInitialDataFromApiResponseHandler(
          config,
          msg.dataSourceId,
          msg.result,
          model,
        )

      case 'GetMorePrevData':
        return getMorePrevDataHandler(msg.networkStatus, model)

      case 'GetMorePrevDataFromCacheResponse':
        return getMorePrevDataFromCacheResponseHandler(
          networkStatus,
          config,
          msg.dataSourceId,
          msg.cache,
          model,
        )

      case 'GetMorePrevDataFromApiResponse':
        return getMorePrevDataFromApiResponseHandler(
          config,
          msg.dataSourceId,
          msg.result,
          model,
        )

      case 'GetMoreNextData':
        return getMoreNextDataHandler(msg.networkStatus, model)

      case 'GetMoreNextDataFromCacheResponse':
        return getMoreNextDataFromCacheResponseHandler(
          networkStatus,
          config,
          msg.dataSourceId,
          msg.cache,
          model,
        )

      case 'GetMoreNextDataFromApiResponse':
        return getMoreNextDataFromApiResponseHandler(
          config,
          msg.dataSourceId,
          msg.result,
          model,
        )

      case 'SetInvisWhileScrolling':
        if (msg.dataSourceId === model.mode.dataSourceId) {
          return [
            {
              ...model,
              invisWhileScrolling: msg.value,
              isScrolling: msg.value ? model.isScrolling : false,
            },
            Cmd.none(),
          ]
        } else {
          return [model, Cmd.none()]
        }

      case 'ScrollToCurrentDone':
        if (model.mode.dataSourceId === msg.dataSourceId) {
          return [
            {
              ...model,
              invisWhileScrolling: false,
            },
            Cmd.none(),
          ]
        } else {
          return [model, Cmd.none()]
        }

      case 'ContainerScroll':
        return [
          {
            ...model,
            isScrolling: msg.isScrolling,
          },
          Cmd.none(),
        ]

      case 'ItemMsg':
        return [model, Cmd.none()]

      case 'SetState':
        return [msg.value, Cmd.none()]
    }
  }
