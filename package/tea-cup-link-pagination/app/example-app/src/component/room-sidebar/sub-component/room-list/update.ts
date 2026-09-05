import * as RD from '@devexperts/remote-data-ts'
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { attemptTE, updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../../../api'
import { type Model, type Msg, type RoomItemMsg } from './type'
import { mkRoomListLogicConfig } from './util'

export const mkRoomListLinkPaginationMode = (
  activeRoomId: string | null,
  latencyMs: number,
  networkOnline: boolean,
): LinkPagination.Mode<Api.Room> => {
  return {
    dataSourceId: 'sidebar-rooms',
    overallData: LinkPagination.SUA.empty(),
    prevData: RD.initial,
    prevSize: LinkPagination.size(15),
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
          TE.mapLeft((httpErr) => httpErr.actualErr),
        ),
    }),
    initialData: RD.initial,
    selectedKey: activeRoomId,
    retriggerCurrentData: 'done',
    animationEnd: false,

    // prevHandler: loads older / more items below (bottom of list)
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
            limit: pageSize.value,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => httpErr.actualErr),
        )
      },
    }),

    // nextHandler: loads newer / items above (top of list)
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
            limit: pageSize.value,
            latencyMs,
            networkOnline,
          }),
          TE.mapLeft((httpErr) => httpErr.actualErr),
        )
      },
    }),
    nextData: RD.initial,
    nextSize: LinkPagination.size(15),
    nextIsMax: true,
  }
}

export const init = (
  activeRoomId: string | null = 'room-general',
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const refs = LinkPagination.mkRefs()
  const mode = mkRoomListLinkPaginationMode(
    activeRoomId,
    latencyMs,
    networkOnline,
  )
  const [linkPagin, linkPaginCmd] = LinkPagination.init<Api.Room, RoomItemMsg>(
    networkOnline,
    mode,
  )

  const model: Model = {
    linkPagin,
    refs,
    expandedRoomIds: new Set<string>(),
  }

  return [
    model,
    linkPaginCmd.map((subMsg): Msg => ({ _tag: 'LinkPaginMsg', subMsg })),
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
  const logicConfig = mkRoomListLogicConfig(model)
  const [newLinkPagin, linkPaginCmd] = LinkPagination.update<
    Api.Room,
    RoomItemMsg
  >(networkOnline, logicConfig)(subMsg, model.linkPagin)

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
      if (subMsg._tag === 'ItemMsg') {
        const [updatedModel, cmd, containerChangeEvent] = roomItemMsgHandler(
          subMsg.item,
          subMsg.msg,
        )(m)
        return [
          {
            ...updatedModel,
            linkPagin: {
              ...updatedModel.linkPagin,
              containerChangeEvent,
            },
          },
          cmd,
        ]
      }
      return [m, Cmd.none()]
    }),
  )
}

const roomItemMsgHandler =
  (item: Api.Room, msg: RoomItemMsg) =>
  (model: Model): [Model, Cmd<Msg>, LinkPagination.ContainerChangeEvent] => {
    switch (msg._tag) {
      case 'SelectRoom':
        return [model, Cmd.none(), { _tag: 'NoChange' }]

      case 'MarkAsRead':
        return [
          model,
          attemptTE(
            TE.rightIO(() => {
              window.alert('functionality not implemented yet')
            }),
            (): Msg => ({ _tag: 'NoOp' }),
          ),
          { _tag: 'NoChange' },
        ]

      case 'ToggleFavorite': {
        const updatedRoom: Api.Room = {
          ...item,
          isPrivate: !item.isPrivate,
        }
        return [
          {
            ...model,
            linkPagin: LinkPagination.updateItem<Api.Room>(
              (r) => r.id === item.id,
              updatedRoom,
            )(model.linkPagin),
          },
          Cmd.none(),
          { _tag: 'ElementModifyInPlace' },
        ]
      }

      case 'ToggleExpand': {
        const nextExpanded = new Set(model.expandedRoomIds)
        if (nextExpanded.has(item.id)) {
          nextExpanded.delete(item.id)
        } else {
          nextExpanded.add(item.id)
        }
        return [
          { ...model, expandedRoomIds: nextExpanded },
          Cmd.none(),
          { _tag: 'ElementModifyOnBottom' },
        ]
      }
    }
  }

const updateRoomSuccessHandler = (
  room: Api.Room,
  model: Model,
): [Model, Cmd<Msg>] => {
  const newLinkPagin = LinkPagination.updateItem<Api.Room>(
    (r) => r.id === room.id,
    room,
  )(model.linkPagin)

  return [{ ...model, linkPagin: newLinkPagin }, Cmd.none()]
}
