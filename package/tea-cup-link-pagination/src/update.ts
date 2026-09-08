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
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  addOrUpdateDataHandler,
  addToNextOverallDataHandler,
  addToPrevOverallDataHandler,
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
  replaceFuncAsyncCmd,
  replaceFuncHandler,
  scrollToKeyHandler,
  scrollToNewestHandler,
  setModeAndAddUpdateDataHandler,
  setNewSelectedKeyHandler,
} from './handler'
import {
  type LogicConfig,
  type Mode,
  type Model,
  type Msg,
  type ShouldRestoreScrollStateArg,
} from './type'

// -------------------------------------------
// Init
// -------------------------------------------

export function init<A, amsg, Route>(
  networkStatus: boolean,
  mode: Mode<A>,
  onContainerScroll?: (dataSourceId: string, e: HTMLDivElement) => void,
  shouldRestoreScrollState?: ShouldRestoreScrollStateArg,
): [Model<A>, Cmd<Msg<A, amsg, Route>>] {
  const model = {
    mode,
    containerChangeEvent: { _tag: 'NoChange' },
    onContainerScroll,
    shouldRestoreScrollState,

    invisWhileScrolling: false,
    isScrolling: false,
    savedScrollPos: null,
    initialScrollDone: false,
  } satisfies Model<A>

  return getInitialDataHandler(
    networkStatus,
    model.mode.dataSourceId,
  )<A, amsg, Route>(model)
}

//
// -------------------------------------------
// Update
// -------------------------------------------

export const update =
  <A, B, amsg, Route>(
    networkStatus: boolean,
    config: LogicConfig<A, B, amsg>,
  ) =>
  (
    parentModel: B,
    msg: Msg<A, amsg, Route>,
    model: Model<A>,
  ): [Model<A>, Cmd<Msg<A, amsg, Route>>, AppRouteUpdater<Route>] => {
    switch (msg._tag) {
      case 'NoOp':
        return [
          {
            ...model,
          },
          Cmd.none(),
          null,
        ]
      case 'ScrollToNewest': {
        const [m, cmd] = scrollToNewestHandler<A, amsg, Route>(
          config.refs,
          config.isReversed,
          model,
        )
        return [m, cmd, null]
      }
      case 'ForceScrollTo': {
        const [m, cmd] = forceScrollToHandler<A, amsg, Route>(
          config.refs,
          model,
          msg,
        )
        return [m, cmd, null]
      }
      case 'ScrollToKey': {
        const [m, cmd] = scrollToKeyHandler<A, amsg, Route>(
          config.refs,
          model,
          msg.key,
        )
        return [m, cmd, null]
      }
      // TODO: Disabled for now since we disable prefetching
      // case 'PopulateFirstResponse': {
      // const populateFirstResponse = (
      //   mode: Mode<A>,
      //   cacheRD: RD.RemoteData<string, A[]>,
      //   currentResult: E.Either<string, A[]>,
      // ) => {
      //   if (currentResult._tag === 'Right') {
      //     dispatch(props)({
      //       _tag: 'SetInitialData',
      //       dataSourceId: mode.dataSourceId,
      //       value: RD.success(currentResult.right),

      //       command: O.none,
      //       // command:
      //       //   cacheRD._tag === 'RemoteSuccess'
      //       //     ? O.none
      //       //     : O.some({
      //       //         _tag: 'ScrollToCurrent',
      //       //         isGraceful: false,
      //       //         invokeTime: new Date(),
      //       //       }),
      //     })
      //   } else {
      //     console.warn('current data return errors.')
      //   }
      // }
      //   // Only handle this Msg when the overall data is 0.
      //   if (model.mode.overallData.value.length === 0)
      //     populateFirstResponse(
      //       model.mode,
      //       RD.initial,
      //       props.msgFromParent.result,
      //     )
      //   break
      // }

      case 'ReplaceFuncAsync': {
        return [model, replaceFuncAsyncCmd(model, { ...msg }), null]
      }

      // --------------------------------------------
      // Datasource specific
      case 'AddOrUpdateData': {
        return [
          addOrUpdateDataHandler(config, model, { ...msg }),
          Cmd.none(),
          null,
        ]
      }
      case 'SetPrevData':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                prevData: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]
      // Add `msg.value` to `PrevOverallData`, overwrite if it already exists.
      case 'AddToPrevOverallData': {
        if (msg.dataSourceId === model.mode.dataSourceId) {
          return [
            addToPrevOverallDataHandler(config, model, msg.value),
            Cmd.none(),
            null,
          ]
        } else return [model, Cmd.none(), null]
      }
      case 'SetPrevIsMax':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                prevIsMax: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]

      case 'SetInitialData': {
        if (msg.dataSourceId === model.mode.dataSourceId)
          if (msg.value._tag === 'RemoteSuccess') {
            // const initialNextOverallData = msg.value.value.next
            // const initialCurrentData = msg.value.value.current
            // const initialPrevOverallData = msg.value.value.prev
            const initialData = msg.value.value

            const overallData = pipe(
              initialData,
              SUA.fromArray(config.eqWithKey, config.ord),
            )

            return [
              {
                ...model,
                mode: {
                  ...model.mode,
                  initialData: RD.success(initialData),
                  // prevData: prevRD,
                  // nextData: nextRD,
                  overallData,
                },

                // command:
                //   msg.command._tag === 'Some'
                //     ? msg.command.value
                //     : { _tag: 'NoChange' },
              },
              Cmd.none(),
              null,
            ]
          } else
            return [
              {
                ...model,
                mode: {
                  ...model.mode,
                  initialData: msg.value,
                },
              },
              Cmd.none(),
              null,
            ]
        else return [model, Cmd.none(), null]
      }

      case 'SetNextData':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                nextData: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]
      case 'AddToNextOverallData': {
        if (msg.dataSourceId === model.mode.dataSourceId) {
          return [
            addToNextOverallDataHandler(config, model, msg.value),
            Cmd.none(),
            null,
          ]
        } else return [model, Cmd.none(), null]
      }

      case 'SetNextIsMax':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                nextIsMax: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]

      case 'SetReTriggerCurrentData':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                retriggerCurrentData: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]
      case 'SetAnimationEnd':
        if (msg.dataSourceId === model.mode.dataSourceId)
          return [
            {
              ...model,
              mode: {
                ...model.mode,
                animationEnd: msg.value,
              },
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]

      case 'SetModeAndAddUpdateData': {
        const [m, cmd] = setModeAndAddUpdateDataHandler<A, B, amsg, Route>(
          networkStatus,
          config,
          model,
          {
            ...msg,
          },
        )
        return [m, cmd, null]
      }
      case 'SetNewSelectedKey': {
        const [m, cmd] = setNewSelectedKeyHandler<A, B, amsg, Route>(
          networkStatus,
          config,
          model,
          { ...msg },
        )
        return [m, cmd, null]
      }
      case 'SetContainerChangeEvent':
        return [
          {
            ...model,
            containerChangeEvent: msg.value,
          },
          Cmd.none(),
          null,
        ]
      case 'MapFunc': {
        return [mapFuncHandler(config, model, { ...msg }), Cmd.none(), null]
      }
      case 'ReplaceFunc': {
        const [newModel, routeUpdater] = replaceFuncHandler(model, { ...msg })
        return [newModel, Cmd.none(), routeUpdater]
      }
      case 'SetIsScrolling': {
        return [
          {
            ...model,
            isScrolling: msg.value,
            savedScrollPos:
              msg.savedScrollPos !== undefined
                ? msg.savedScrollPos
                : model.savedScrollPos,
          },
          Cmd.none(),
          null,
        ]
      }

      case 'GetMorePrevData': {
        const [m, cmd] = getMorePrevDataHandler<A, amsg, Route>(
          networkStatus,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMorePrevDataFromCacheResponse': {
        const [m, cmd] = getMorePrevDataFromCacheResponseHandler<
          A,
          B,
          amsg,
          Route
        >(
          networkStatus,
          config,
          msg.dataSourceId,
          msg.endpoint,
          msg.cache,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMorePrevDataFromApiResponse': {
        const [m, cmd] = getMorePrevDataFromApiResponseHandler<
          A,
          B,
          amsg,
          Route
        >(
          config,
          msg.dataSourceId,
          msg.overallDataBeforeCache,
          msg.result,
          model,
        )
        return [m, cmd, null]
      }

      case 'GetMoreNextData': {
        const [m, cmd] = getMoreNextDataHandler<A, amsg, Route>(
          networkStatus,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMoreNextDataFromCacheResponse': {
        const [m, cmd] = getMoreNextDataFromCacheResponseHandler<
          A,
          B,
          amsg,
          Route
        >(
          networkStatus,
          config,
          msg.dataSourceId,
          msg.endpoint,
          msg.cache,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMoreNextDataFromApiResponse': {
        const [m, cmd] = getMoreNextDataFromApiResponseHandler<
          A,
          B,
          amsg,
          Route
        >(
          config,
          msg.dataSourceId,
          msg.overallDataBeforeCache,
          msg.result,
          model,
        )
        return [m, cmd, null]
      }

      // ----------------------------------------------------
      case 'SetState':
        return [
          {
            ...msg.value,
          },
          Cmd.none(),
          msg.routeUpdater ? msg.routeUpdater : null,
        ]

      case 'GetInitialData': {
        const [m, cmd] = getInitialDataHandler(
          networkStatus,
          model.mode.dataSourceId,
        )<A, amsg, Route>(model)
        return [m, cmd, null]
      }
      case 'GetInitialDataFromCacheResponse': {
        const [m, cmd] = getInitialDataFromCacheResponseHandler<
          A,
          B,
          amsg,
          Route
        >(networkStatus, config, msg.dataSourceId, msg.cache, model)
        return [m, cmd, null]
      }
      case 'SetInvisWhileScrolling': {
        if (msg.dataSourceId === model.mode.dataSourceId) {
          return [
            {
              ...model,
              invisWhileScrolling: msg.value,
              isScrolling: msg.value ? model.isScrolling : false,
            },
            Cmd.none(),
            null,
          ]
        } else return [model, Cmd.none(), null]
      }

      case 'GetInitialDataFromApiResponse': {
        const [m, cmd] = getInitialDataFromApiResponseHandler<
          A,
          B,
          amsg,
          Route
        >(config, msg.dataSourceId, msg.result, model)
        return [m, cmd, null]
      }

      case 'ScrollToCurrentDone': {
        if (model.mode.dataSourceId === msg.dataSourceId)
          return [
            {
              ...model,
              invisWhileScrolling: false,
            },
            Cmd.none(),
            null,
          ]
        else return [model, Cmd.none(), null]
      }

      case 'ChildMsg': {
        const i = pipe(
          model.mode.overallData,
          SUA.findIndexOption((c) => config.uniqueKeyField(c) === msg.childId),
        )
        if (i._tag === 'Some') {
          const currentItem = model.mode.overallData.value[i.value]
          if (currentItem !== undefined) {
            const [childModel, childCmd, containerChangeEvent] = config.update(
              parentModel,
              msg.subMsg,
              currentItem,
            )
            return [
              {
                ...model,
                mode: {
                  ...model.mode,
                  overallData: pipe(
                    model.mode.overallData,
                    SUA.updateAtOrKeep(i.value, childModel),
                  ),
                },
                containerChangeEvent,
              },
              childCmd.map((subMsg) => ({
                _tag: 'ChildMsg',
                childId: msg.childId,
                subMsg,
              })),
              null,
            ]
          }
        }
        return [model, Cmd.none(), null]
      }
    }
  }
