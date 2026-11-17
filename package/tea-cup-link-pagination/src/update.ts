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
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { type AppRouteUpdater } from '@rinn7e/tea-cup-prelude/type/app-route-updater'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import { type IO } from 'fp-ts/lib/IO'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  addOrUpdateDataHandler,
  addToNextOverallDataHandler,
  addToPrevOverallDataHandler,
  endOpenOnReaderHandler,
  getInitialDataFromApiResponseHandler,
  getInitialDataFromCacheResponseHandler,
  getInitialDataHandler,
  getMoreNextDataFromApiResponseHandler,
  getMoreNextDataFromCacheResponseHandler,
  getMoreNextDataHandler,
  getMorePrevDataFromApiResponseHandler,
  getMorePrevDataFromCacheResponseHandler,
  getMorePrevDataHandler,
  loadAtEdgeHandler,
  mapFuncHandler,
  refreshInitialDataHandler,
  replaceFuncAsyncCmd,
  replaceFuncHandler,
  scrollContainerMsgHandler,
  scrollToKeyHandler,
  scrollToNewestHandler,
  setNewSelectedKeyHandler,
} from './handler'
import { type LogicConfig, type Mode, type Model, type Msg } from './type'
import { heldPageOf } from './util'

// -------------------------------------------
// Init
// -------------------------------------------

export function init<Item, ItemMsg, Route>(
  networkStatus: boolean,
  mode: Mode<Item>,
  onAnchor?: (dataSourceId: string, anchor: ScrollContainer.Anchor) => IO<void>,
): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>] {
  const model = {
    mode,
    onAnchor,

    initialScroll: { _tag: 'Pending' },
    scrollContainer: ScrollContainer.init(),
    flash: null,
  } satisfies Model<Item>

  return getInitialDataHandler(networkStatus)<Item, ItemMsg, Route>(model)
}

//
// -------------------------------------------
// Update
// -------------------------------------------

export const update =
  <Item, Parent, ItemMsg, Route>(
    networkStatus: boolean,
    config: LogicConfig<Item, Parent, ItemMsg>,
  ) =>
  (
    parentModel: Parent,
    msg: Msg<Item, ItemMsg, Route>,
    model: Model<Item>,
  ): [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>, AppRouteUpdater<Route>] => {
    // A page arriving while the reader moves the list waits until it rests
    // (`Model.heldPages`). Because of iOS: rows added above need the position
    // moved down by their height, and iOS ignores (or, after the finger
    // lifts, cancels the fling on) a position write while a touch moves the
    // list, so the engine would hold the rows out of reach above the old first
    // row, and the reader would bounce at it with blank space above.
    const page = heldPageOf(msg)
    if (page !== null && model.readerScrolling === true) {
      return [
        { ...model, heldPages: [...(model.heldPages ?? []), page] },
        Cmd.none(),
        null,
      ]
    }
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
        const [m, cmd] = scrollToNewestHandler<Item, Parent, ItemMsg, Route>(
          config,
          model,
          msg.behavior,
        )
        return [m, cmd, null]
      }
      case 'ScrollToKey': {
        const [m, cmd] = scrollToKeyHandler<Item, ItemMsg, Route>(
          model,
          msg.key,
        )
        return [m, cmd, null]
      }
      case 'FlashDone': {
        // Only the timer of the current highlight: a newer one keeps its own
        return [
          model.flash !== null && model.flash.seq === msg.seq
            ? { ...model, flash: null }
            : model,
          Cmd.none(),
          null,
        ]
      }
      // TODO: broken (works on a stale model), see `ReplaceFuncAsync` in `type.ts`
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
      case 'AddToNextOverallData': {
        if (msg.dataSourceId === model.mode.dataSourceId) {
          return [
            addToNextOverallDataHandler(config, model, msg.value),
            Cmd.none(),
            null,
          ]
        } else return [model, Cmd.none(), null]
      }

      case 'SetNewSelectedKey': {
        const [m, cmd] = setNewSelectedKeyHandler<Item, Parent, ItemMsg, Route>(
          networkStatus,
          config,
          model,
          { ...msg },
        )
        return [m, cmd, null]
      }
      case 'MapFunc': {
        return [mapFuncHandler(config, model, { ...msg }), Cmd.none(), null]
      }
      case 'ReplaceFunc': {
        const [newModel, routeUpdater] = replaceFuncHandler(config, model, {
          ...msg,
        })
        return [newModel, Cmd.none(), routeUpdater]
      }

      case 'GetMorePrevData': {
        const [m, cmd] = getMorePrevDataHandler<Item, ItemMsg, Route>(
          networkStatus,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMorePrevDataFromCacheResponse': {
        const [m, cmd] = getMorePrevDataFromCacheResponseHandler<
          Item,
          Parent,
          ItemMsg,
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
          Item,
          Parent,
          ItemMsg,
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
        const [m, cmd] = getMoreNextDataHandler<Item, ItemMsg, Route>(
          networkStatus,
          model,
        )
        return [m, cmd, null]
      }
      case 'GetMoreNextDataFromCacheResponse': {
        const [m, cmd] = getMoreNextDataFromCacheResponseHandler<
          Item,
          Parent,
          ItemMsg,
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
          Item,
          Parent,
          ItemMsg,
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
          msg.value,
          Cmd.none(),
          msg.routeUpdater ? msg.routeUpdater : null,
        ]

      case 'GetInitialData': {
        const [m, cmd] = getInitialDataHandler(networkStatus)<
          Item,
          ItemMsg,
          Route
        >(model)
        return [m, cmd, null]
      }
      case 'RefreshInitialData': {
        const [m, cmd] = refreshInitialDataHandler(networkStatus)<
          Item,
          ItemMsg,
          Route
        >(model)
        return [m, cmd, null]
      }
      case 'GetInitialDataFromCacheResponse': {
        const [m, cmd] = getInitialDataFromCacheResponseHandler<
          Item,
          Parent,
          ItemMsg,
          Route
        >(networkStatus, config, msg.dataSourceId, msg.cache, model)
        return [m, cmd, null]
      }
      case 'GetInitialDataFromApiResponse': {
        const [m, cmd] = getInitialDataFromApiResponseHandler<
          Item,
          Parent,
          ItemMsg,
          Route
        >(config, msg.dataSourceId, msg.result, model)
        return [m, cmd, null]
      }

      case 'ScrollContainerMsg': {
        const subMsg = msg.subMsg
        const readerScrolling =
          subMsg._tag === 'ReaderScrolled'
            ? true
            : subMsg._tag === 'ScrollSettled'
              ? false
              : model.readerScrolling
        const [m, cmd] = pipe(
          scrollContainerMsgHandler<Item, Parent, ItemMsg, Route>(
            config,
            msg.subMsg,
          )({ ...model, readerScrolling }),
          updateAndCmd(endOpenOnReaderHandler(msg.subMsg)),
          updateAndCmd(
            loadAtEdgeHandler<Item, Parent, ItemMsg, Route>(
              networkStatus,
              config,
              msg.subMsg,
            ),
          ),
        )
        // At rest: the pages that arrived while the reader moved the list go
        // in now, in order, the position kept by the engine as for any page
        const held = subMsg._tag === 'ScrollSettled' ? (m.heldPages ?? []) : []
        if (held.length === 0) {
          return [m, cmd, null]
        } else {
          const [replayed, cmds] = held.reduce<
            [Model<Item>, Cmd<Msg<Item, ItemMsg, Route>>[]]
          >(
            ([acc, done], heldPage) => {
              const [next, next_cmd] = update<Item, Parent, ItemMsg, Route>(
                networkStatus,
                config,
              )(parentModel, heldPage, acc)
              return [next, [...done, next_cmd]]
            },
            [{ ...m, heldPages: [] }, [cmd]],
          )
          return [replayed, Cmd.batch(cmds), null]
        }
      }

      case 'ChildMsg': {
        const i = pipe(
          model.mode.overallData,
          SUA.findIndexOption((c) => config.uniqueKeyField(c) === msg.childId),
        )
        if (i._tag === 'Some') {
          const currentItem = model.mode.overallData.value[i.value]
          if (currentItem !== undefined) {
            const [childModel, childCmd] = config.update(
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
