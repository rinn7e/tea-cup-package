import * as RD from '@devexperts/remote-data-ts'
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { mkHttpError } from '@rinn7e/tea-cup-prelude/type/http-error'
import { size } from '@rinn7e/tea-cup-prelude/type/size'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import {
  type Model,
  type Msg,
  type ParentContext,
  type RoomItemMsg,
} from './type'
import { logicConfig } from './util'

export const mkRoomListLinkPaginationMode = (
  activeRoomId: string | null,
  latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Room> => {
  return {
    dataSourceId: 'sidebar-rooms',
    overallData: SUA.empty(),
    prevData: RD.initial,
    prevSize: size(15),
    prevIsMax: false,
    allowRetryPrev: false,

    initialHandler: () => ({
      cache: async () => Api.getCachedRooms(),
      endpoint: () =>
        pipe(
          Api.fetchInitialRooms({
            targetRoomId: activeRoomId,
            pageSize: 15,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        ),
    }),
    initialData: RD.initial,
    selectedKey: activeRoomId,
    retriggerCurrentData: 'done',
    animationEnd: false,

    // prevHandler: loads older / more items below (bottom of list when non-reversed)
    prevHandler: (overallData) => (pageSize) => ({
      cache: async () => Api.getCachedRooms(),
      endpoint: () => {
        const beforeTimestamp =
          overallData.length > 0
            ? overallData[overallData.length - 1]?.lastMessage?.timestamp
            : undefined
        return pipe(
          Api.fetchPrevRooms({
            beforeTimestamp,
            limit: pageSize,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        )
      },
    }),

    // nextHandler: loads newer / items above (top of list when non-reversed)
    nextHandler: (overallData) => (pageSize) => ({
      cache: async () => Api.getCachedRooms(),
      endpoint: () => {
        const afterTimestamp =
          overallData.length > 0
            ? overallData[0]?.lastMessage?.timestamp
            : undefined
        return pipe(
          Api.fetchNextRooms({
            afterTimestamp,
            limit: pageSize,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => mkHttpError(httpErr.actualErr)),
        )
      },
    }),
    nextData: RD.initial,
    nextSize: size(15),
    nextIsMax: true,
  }
}

export const init = (
  activeRoomId: string | null = 'room-general',
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const mode = mkRoomListLinkPaginationMode(
    activeRoomId,
    latencyMs,
    networkOnline,
  )
  const [linkPagin, linkPaginCmd] = LinkPagination.init<
    Api.Room,
    RoomItemMsg,
    AppRoute
  >(networkOnline, mode)

  const model: Model = {
    linkPagin,
    expandedRoomIds: new Set<string>(),
  }

  return [
    model,
    linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
  ]
}

export const reInit = (
  activeRoomId: string | undefined,
  oldModel: Model,
  _latencyMs = 80,
  _networkOnline = true,
): [Model, Cmd<Msg>] => {
  return [
    {
      ...oldModel,
      linkPagin: {
        ...oldModel.linkPagin,
        mode: {
          ...oldModel.linkPagin.mode,
          selectedKey: activeRoomId ?? null,
        },
      },
    },
    Cmd.none(),
  ]
}

export const update = (
  msg: Msg,
  model: Model,
  networkOnline: boolean = true,
): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'LinkPaginMsg':
      return linkPaginMsgHandler(msg.subMsg, model, networkOnline)

    case 'SelectRoom':
      return [model, Cmd.none()]

    case 'UpdateRoomSuccess':
      return updateRoomSuccessHandler(msg.room, model)
  }
}

const linkPaginMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'LinkPaginMsg' }>['subMsg'],
  model: Model,
  networkOnline: boolean,
): [Model, Cmd<Msg>] => {
  const parentSt: ParentContext = {
    activeRoomId: undefined,
    expandedRoomIds: model.expandedRoomIds,
    dispatch: () => {},
  }
  const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
    Api.Room,
    ParentContext,
    RoomItemMsg,
    AppRoute
  >(networkOnline, logicConfig)(parentSt, subMsg, model.linkPagin)

  return pipe(
    [
      { ...model, linkPagin: newLinkPagin },
      linkPaginCmd.map(
        (m): Msg => ({
          _tag: 'LinkPaginMsg',
          subMsg: m,
        }),
      ),
    ] satisfies [Model, Cmd<Msg>],
    updateAndCmd((m) => {
      if (subMsg._tag === 'ChildMsg' && subMsg.subMsg._tag === 'ToggleExpand') {
        const nextExpanded = new Set(m.expandedRoomIds)
        if (nextExpanded.has(subMsg.childId)) {
          nextExpanded.delete(subMsg.childId)
        } else {
          nextExpanded.add(subMsg.childId)
        }
        return [{ ...m, expandedRoomIds: nextExpanded }, Cmd.none()]
      }
      return [m, Cmd.none()]
    }),
  )
}

const updateRoomSuccessHandler = (
  room: Api.Room,
  model: Model,
): [Model, Cmd<Msg>] => {
  const [newLinkPagin] = LinkPagination.replaceFuncHandler(model.linkPagin, {
    func: (overallData) => [
      SUA.fromArray(
        Api.RoomEq,
        Api.RoomOrd,
      )(overallData.value.map((r) => (r.id === room.id ? room : r))),
      null,
    ],
    containerChangeEvent: { _tag: 'ElementModifyInPlace' },
  })

  return [{ ...model, linkPagin: newLinkPagin }, Cmd.none()]
}
