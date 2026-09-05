import * as TeaRouter from '@rinn7e/tea-cup-router'
import * as O from 'fp-ts/lib/Option'
import * as Tuple from 'fp-ts/lib/Tuple'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type AppRoute } from '../common/route/type'
import { type Shared, mkRouterConfig } from '../common/router'
import {
  type EachPageModel,
  type PageModel,
  getRoomDraftPage,
  upsertRoomChatPageDict,
} from '../common/type/page-model'
import * as RoomDetailModal from '../component/room-detail-modal'
import * as RoomSidebar from '../component/room-sidebar'
import * as RoomChatPage from '../page/room-chat'
import * as RoomDraftPage from '../page/room-draft'
import { type Model, type Msg } from '../type'

export const initPageModel = (
  route: AppRoute,
  shared: Shared,
  prev?: {
    readonly route: AppRoute
    readonly pageModel: PageModel
  },
  forceRefresh: boolean = false,
): [PageModel, Cmd<Msg>] => {
  const prevPageModel = prev?.pageModel

  // Determine active room ID for the sidebar highlight
  let activeRoomId: string | undefined
  if (route.page._tag === 'RoomChatPage') {
    activeRoomId = route.page.roomId
  } else if (route.page._tag === 'RoomDraftPage') {
    activeRoomId = route.page.roomId
  }

  // 1. Sidebar (LinkPagination Room List)
  const [roomSidebar, sidebarCmd] = prevPageModel
    ? RoomSidebar.reInit(
        activeRoomId,
        prevPageModel.roomSidebar,
        shared.latencyMs,
        shared.networkOnline,
      )
    : RoomSidebar.init(activeRoomId, shared.latencyMs, shared.networkOnline)

  // 2. Room Detail Modal (Details / Members)
  const [roomDetailModal, roomDetailModalCmd] = O.isSome(route.sidebarParam)
    ? prevPageModel && O.isSome(prevPageModel.roomDetailModal)
      ? pipe(
          RoomDetailModal.reInit(
            route.sidebarParam,
            prevPageModel.roomDetailModal.value,
          ),
          Tuple.mapFst(O.some),
        )
      : pipe(RoomDetailModal.init(route.sidebarParam), Tuple.mapFst(O.some))
    : [O.none, Cmd.none<RoomDetailModal.Msg>()]

  const layoutCmd = Cmd.batch([
    sidebarCmd.map((subMsg): Msg => ({ _tag: 'RoomSidebarMsg', subMsg })),
    roomDetailModalCmd.map(
      (subMsg): Msg => ({ _tag: 'RoomDetailModalMsg', subMsg }),
    ),
  ])

  // 3. Main Center Page
  const initEachPage = (): [
    {
      roomChatPageDict: Map<string, RoomChatPage.Model>
      eachPageModel: EachPageModel
    },
    Cmd<Msg>,
  ] => {
    switch (route.page._tag) {
      case 'HomePage': {
        return [
          {
            roomChatPageDict: prevPageModel?.roomChatPageDict ?? new Map(),
            eachPageModel: { _tag: 'HomePageModel' },
          },
          Cmd.none(),
        ]
      }

      case 'NotFoundPage': {
        return [
          {
            roomChatPageDict: prevPageModel?.roomChatPageDict ?? new Map(),
            eachPageModel: { _tag: 'NotFoundPageModel', path: route.page.path },
          },
          Cmd.none(),
        ]
      }

      case 'RoomDraftPage': {
        const existingDraftModel = prevPageModel
          ? getRoomDraftPage(prevPageModel)
          : O.none

        const [draftModel, draftCmd] =
          existingDraftModel._tag === 'Some'
            ? RoomDraftPage.reInit(route.page.roomId, existingDraftModel.value)
            : RoomDraftPage.init(route.page.roomId)

        const cmd = draftCmd.map(
          (subMsg): Msg => ({ _tag: 'RoomDraftPageMsg', subMsg }),
        )

        return [
          {
            roomChatPageDict: prevPageModel?.roomChatPageDict ?? new Map(),
            eachPageModel: {
              _tag: 'RoomDraftPageModel',
              model: draftModel,
            },
          },
          cmd,
        ]
      }

      case 'RoomChatPage': {
        const roomId = route.page.roomId
        const targetChatId = O.toNullable(route.page.targetChatId)
        const existingChatPageModel =
          prevPageModel?.roomChatPageDict.get(roomId)

        const [newRoomChatModel, chatCmd] = existingChatPageModel
          ? RoomChatPage.reInit(
              roomId,
              targetChatId,
              existingChatPageModel,
              shared.refs,
              shared.latencyMs,
              shared.networkOnline,
              forceRefresh,
            )
          : RoomChatPage.init(
              roomId,
              targetChatId,
              shared.latencyMs,
              shared.networkOnline,
            )

        const newDict = upsertRoomChatPageDict(
          roomId,
          newRoomChatModel,
          prevPageModel?.roomChatPageDict ?? new Map(),
        )

        const cmd = chatCmd.map(
          (subMsg): Msg => ({
            _tag: 'RoomChatPageMsg',
            roomId,
            subMsg,
          }),
        )

        return [
          {
            roomChatPageDict: newDict,
            eachPageModel: { _tag: 'RoomChatPageModel', roomId },
          },
          cmd,
        ]
      }
    }
  }

  const [pageResult, pageCmd] = initEachPage()

  return [
    {
      ...pageResult,
      roomSidebar,
      roomDetailModal,
    },
    Cmd.batch([pageCmd, layoutCmd]),
  ]
}

export const routerConfig = mkRouterConfig<Msg>(initPageModel, (subMsg) => ({
  _tag: 'TeaRouterMsg',
  subMsg,
}))

export const teaRouterMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'TeaRouterMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const [routerModel, routerCmd] = TeaRouter.update(routerConfig, model.shared)(
    subMsg,
    model.router,
  )

  return [
    {
      ...model,
      router: routerModel,
    },
    routerCmd,
  ]
}
