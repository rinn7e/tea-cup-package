import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { Cmd, type Sub } from 'tea-cup-fp'

import type * as Api from '../../api'
import { type AppRoute } from '../../common/route/type'
import * as RoomList from './sub-component/room-list'
import { type RoomItemMsg } from './sub-component/room-list/type'
import { type Model, type Msg } from './type'

export const init = (
  activeRoomId?: string,
  latencyMs = 80,
  networkOnline = true,
): [Model, Cmd<Msg>] => {
  const [roomList, roomListCmd] = RoomList.init(
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
  activeRoomId: string | undefined,
  oldModel: Model,
  _latencyMs = 80,
  _networkOnline = true,
): [Model, Cmd<Msg>] => {
  // Update selectedKey in room list mode
  const updatedMode = {
    ...oldModel.roomList.linkPagin.mode,
    selectedKey: activeRoomId ?? null,
  }
  const updatedRoomList: RoomList.Model = {
    ...oldModel.roomList,
    linkPagin: {
      ...oldModel.roomList.linkPagin,
      mode: updatedMode,
    },
  }

  return [
    {
      ...oldModel,
      roomList: updatedRoomList,
    },
    Cmd.none(),
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
  LinkPagination.subscriptions<Api.Room, RoomItemMsg, AppRoute>(
    model.roomList.linkPagin,
  ).map(
    (subMsg): Msg => ({
      _tag: 'RoomListMsg',
      subMsg: { _tag: 'LinkPaginMsg', subMsg },
    }),
  )
