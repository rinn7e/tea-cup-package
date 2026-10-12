import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { Cmd, type Sub } from 'tea-cup-fp'

import type * as Api from '../../api'
import { type MyDB } from '../../common/cache/db/type'
import { AppPageEq, type AppRoute } from '../../common/route/type'
import * as RoomList from './sub-component/room-list'
import {
  type ParentContext,
  type RoomItemMsg,
} from './sub-component/room-list/type'
import { logicConfig } from './sub-component/room-list/util'
import { type Model, type Msg } from './type'

export const init = (
  db: MyDB | null,
  activeRoomId?: string,
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const [roomList, roomListCmd] = RoomList.init(
    db,
    activeRoomId ?? null,
    latencyMs,
    networkOnline,
  )

  const model: Model = {
    roomList,
    totalRoomsCount: 30,
    filterQuery: '',
  }

  return [
    model,
    roomListCmd.map((subMsg): Msg => ({ _tag: 'RoomListMsg', subMsg })),
  ]
}

export const reInit = (
  db: MyDB | null,
  activeRoomId: string | undefined,
  oldModel: Model,
  oldRoute: AppRoute,
  newRoute: AppRoute,
  forceRefresh: boolean,
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  if (AppPageEq.equals(oldRoute.page, newRoute.page) && !forceRefresh) {
    return [oldModel, Cmd.none()]
  }

  // Update the room list: select the active room in it, or init it again
  const [roomList, roomListCmd] = RoomList.reInit(
    db,
    activeRoomId,
    oldModel.roomList,
    oldRoute,
    newRoute,
    forceRefresh,
    latencyMs,
    networkOnline,
  )

  return [
    {
      ...oldModel,
      roomList,
    },
    roomListCmd.map((subMsg): Msg => ({ _tag: 'RoomListMsg', subMsg })),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'RoomListMsg': {
      const [newRoomList, roomListCmd] = RoomList.update(
        msg.subMsg,
        model.roomList,
      )

      return [
        { ...model, roomList: newRoomList },
        roomListCmd.map((subMsg): Msg => ({ _tag: 'RoomListMsg', subMsg })),
      ]
    }

    case 'SetFilterQuery': {
      return [{ ...model, filterQuery: msg.query }, Cmd.none()]
    }
  }
}

export const subscriptions = (model: Model): Sub<Msg> =>
  LinkPagination.subscriptions<Api.Room, RoomItemMsg, AppRoute, ParentContext>(
    model.roomList.linkPagin,
    logicConfig,
  ).map(
    (subMsg): Msg => ({
      _tag: 'RoomListMsg',
      subMsg: { _tag: 'LinkPaginMsg', subMsg },
    }),
  )
