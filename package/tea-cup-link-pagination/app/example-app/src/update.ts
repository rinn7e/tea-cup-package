import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { attemptTE } from '@rinn7e/tea-cup-prelude'
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as TeaRouter from '@rinn7e/tea-cup-router'
import * as TE from 'fp-ts/lib/TaskEither'
import { Cmd, type Result, Sub } from 'tea-cup-fp'

import * as Api from './api'
import { type AppRoute } from './common/route/type'
import {
  type PageModel,
  upsertRoomChatPageDict,
} from './common/type/page-model'
import * as DebugPanel from './component/debug-panel'
import * as RoomDetailModal from './component/room-detail-modal'
import * as RoomSidebar from './component/room-sidebar'
import { routerConfig, teaRouterMsgHandler } from './handler/route-handler'
import * as RoomChatPage from './page/room-chat'
import * as RoomDraftPage from './page/room-draft'
import { type Model, type Msg } from './type'

export const init = (
  location: Location,
  refs: LinkPagination.Refs,
): [Model, Cmd<Msg>] => {
  const shared = {
    networkOnline: true,
    latencyMs: 80,
    refs,
  }

  const [routerModel, routerCmd] = TeaRouter.init(
    routerConfig,
    location,
    shared,
  )

  const [debugPanelModel, debugPanelCmd] = DebugPanel.init(true, 80)

  const model: Model = {
    router: routerModel,
    debugPanel: debugPanelModel,
    shared,
  }

  return [
    model,
    Cmd.batch([
      routerCmd,
      debugPanelCmd.map((m): Msg => ({ _tag: 'DebugPanelMsg', subMsg: m })),
    ]),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'TeaRouterMsg':
      return teaRouterMsgHandler(msg.subMsg, model)

    case 'RoomSidebarMsg':
      return roomSidebarMsgHandler(msg.subMsg, model)

    case 'RoomDetailModalMsg':
      return roomDetailModalMsgHandler(msg.subMsg, model)

    case 'DebugPanelMsg':
      return debugPanelMsgHandler(msg.subMsg, model)

    case 'RoomChatPageMsg':
      return roomChatPageMsgHandler(msg.roomId, msg.subMsg, model)

    case 'RoomDraftPageMsg':
      return roomDraftPageMsgHandler(msg.subMsg, model)

    // ----------------------------------------------------
    // Global Events
    // ----------------------------------------------------
    case 'MarkRoomAsReadGlobalEvent':
      return markRoomAsReadGlobalEventHandler(msg.roomId, model)

    case 'MarkRoomAsReadResponseGlobalEvent':
      return markRoomAsReadResponseGlobalEventHandler(
        msg.roomId,
        msg.result,
        model,
      )

    case 'SimulateIncomingChatGlobalEvent':
      return simulateIncomingChatGlobalEventHandler(msg.roomId, model)

    case 'SimulateIncomingChatResponseGlobalEvent':
      return simulateIncomingChatResponseGlobalEventHandler(msg.result, model)

    case 'SimulateIncomingChatOtherRoomGlobalEvent':
      return simulateIncomingChatOtherRoomGlobalEventHandler(model)

    case 'SimulateIncomingChatOtherRoomResponseGlobalEvent':
      return simulateIncomingChatOtherRoomResponseGlobalEventHandler(
        msg.result,
        model,
      )

    case 'ClearCacheAndResetGlobalEvent':
      return clearCacheAndResetGlobalEventHandler(model)

    case 'ReloadActiveRoomGlobalEvent':
      return reloadActiveRoomGlobalEventHandler(model)

    case 'SetNetworkLatencyGlobalEvent':
      return setNetworkLatencyGlobalEventHandler(msg.ms, model)

    case 'ToggleNetworkOnlineGlobalEvent':
      return toggleNetworkOnlineGlobalEventHandler(model)
  }
}

// ------------------------------------------------------------------
// Sub-Message & Action Handlers
// ------------------------------------------------------------------

const roomSidebarMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'RoomSidebarMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentPageModel = TeaRouter.getPageModel(model.router)
  const [newRoomSidebar, sidebarCmd] = RoomSidebar.update(
    subMsg,
    currentPageModel.roomSidebar,
  )

  const newPageModel: PageModel = {
    ...currentPageModel,
    roomSidebar: newRoomSidebar,
  }

  const newRouter = TeaRouter.setPageModel(model.router, newPageModel)

  return [
    { ...model, router: newRouter },
    sidebarCmd.map((m): Msg => ({ _tag: 'RoomSidebarMsg', subMsg: m })),
  ]
}

const roomDetailModalMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'RoomDetailModalMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentPageModel = TeaRouter.getPageModel(model.router)
  if (currentPageModel.roomDetailModal._tag === 'None') {
    return [model, Cmd.none()]
  }

  const [newRoomDetail, roomDetailCmd] = RoomDetailModal.update(
    subMsg,
    currentPageModel.roomDetailModal.value,
  )

  const newPageModel: PageModel = {
    ...currentPageModel,
    roomDetailModal: { _tag: 'Some', value: newRoomDetail },
  }

  const newRouter = TeaRouter.setPageModel(model.router, newPageModel)

  return [
    { ...model, router: newRouter },
    roomDetailCmd.map((m): Msg => ({ _tag: 'RoomDetailModalMsg', subMsg: m })),
  ]
}

const debugPanelMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'DebugPanelMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const [newDebugPanel, debugCmd] = DebugPanel.update(subMsg, model.debugPanel)

  const newShared = {
    ...model.shared,
    networkOnline: newDebugPanel.networkOnline,
    latencyMs: newDebugPanel.networkLatencyMs,
  }

  return [
    {
      ...model,
      debugPanel: newDebugPanel,
      shared: newShared,
    },
    debugCmd.map((m): Msg => ({ _tag: 'DebugPanelMsg', subMsg: m })),
  ]
}

const roomChatPageMsgHandler = (
  roomId: string,
  subMsg: Extract<Msg, { _tag: 'RoomChatPageMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentPageModel = TeaRouter.getPageModel(model.router)
  const currentChatModel = currentPageModel.roomChatPageDict.get(roomId)

  if (!currentChatModel) {
    return [model, Cmd.none()]
  }

  const [newChatModel, chatCmd] = RoomChatPage.update(
    subMsg,
    currentChatModel,
    model.shared.refs,
    model.shared.networkOnline,
  )

  const newDict = upsertRoomChatPageDict(
    roomId,
    newChatModel,
    currentPageModel.roomChatPageDict,
  )

  const newPageModel: PageModel = {
    ...currentPageModel,
    roomChatPageDict: newDict,
  }

  const newRouter = TeaRouter.setPageModel(model.router, newPageModel)

  return [
    { ...model, router: newRouter },
    chatCmd.map(
      (m): Msg => ({
        _tag: 'RoomChatPageMsg',
        roomId,
        subMsg: m,
      }),
    ),
  ]
}

const roomDraftPageMsgHandler = (
  subMsg: Extract<Msg, { _tag: 'RoomDraftPageMsg' }>['subMsg'],
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentPageModel = TeaRouter.getPageModel(model.router)
  if (currentPageModel.eachPageModel._tag !== 'RoomDraftPageModel') {
    return [model, Cmd.none()]
  }

  const [newDraftModel, draftCmd] = RoomDraftPage.update(
    subMsg,
    currentPageModel.eachPageModel.model,
  )

  const newPageModel: PageModel = {
    ...currentPageModel,
    eachPageModel: { _tag: 'RoomDraftPageModel', model: newDraftModel },
  }

  const newRouter = TeaRouter.setPageModel(model.router, newPageModel)

  return [
    { ...model, router: newRouter },
    draftCmd.map((m): Msg => ({ _tag: 'RoomDraftPageMsg', subMsg: m })),
  ]
}

const getActiveRoomId = (route: AppRoute): string => {
  if (route.page._tag === 'RoomChatPage') return route.page.roomId
  if (route.page._tag === 'RoomDraftPage') return route.page.roomId
  return 'room-general'
}

// ------------------------------------------------------------------
// Global Event Handlers
// ------------------------------------------------------------------

const markRoomAsReadGlobalEventHandler = (
  _roomId: string,
  model: Model,
): [Model, Cmd<Msg>] => {
  return [
    model,
    attemptTE(
      TE.rightIO(() => {
        window.alert('functionality not implemented yet')
      }),
      (): Msg => ({ _tag: 'NoOp' }),
    ),
  ]
}

const markRoomAsReadResponseGlobalEventHandler = (
  _roomId: string,
  result: Result<Api.HttpErrorString, Api.Room>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (result.tag === 'Err') {
    return [model, Cmd.none()]
  }

  const room = result.value
  const currentPageModel = TeaRouter.getPageModel(model.router)
  const [updatedLinkPagin] = LinkPagination.replaceFuncHandler(
    currentPageModel.roomSidebar.roomList.linkPagin,
    {
      func: (overallData) => [
        SUA.fromArray(
          Api.RoomEq,
          Api.RoomOrd,
        )(overallData.value.map((r) => (r.id === room.id ? room : r))),
        null,
      ],
      containerChangeEvent: { _tag: 'ElementModifyInPlace' },
    },
  )

  const updatedRoomSidebar = {
    ...currentPageModel.roomSidebar,
    roomList: {
      ...currentPageModel.roomSidebar.roomList,
      linkPagin: updatedLinkPagin,
    },
  }

  const newPageModel: PageModel = {
    ...currentPageModel,
    roomSidebar: updatedRoomSidebar,
  }

  return [
    {
      ...model,
      router: TeaRouter.setPageModel(model.router, newPageModel),
    },
    Cmd.none(),
  ]
}

const simulateIncomingChatGlobalEventHandler = (
  targetRoomId: string | undefined,
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentRoute = TeaRouter.getRoute(model.router)
  const roomId = targetRoomId ?? getActiveRoomId(currentRoute)

  return [
    model,
    attemptTE(
      Api.simulateIncomingChat({ roomId, latencyMs: 0 }),
      (result): Msg => ({
        _tag: 'SimulateIncomingChatResponseGlobalEvent',
        result,
      }),
    ),
  ]
}

const applyIncomingChat = (
  incomingChat: Api.Chat,
  model: Model,
): [Model, Cmd<Msg>] => {
  const roomId = incomingChat.roomId
  const currentPageModel = TeaRouter.getPageModel(model.router)
  const currentChatModel = currentPageModel.roomChatPageDict.get(roomId)

  if (currentChatModel) {
    const logicConfig = RoomChatPage.mkLogicConfig(
      currentChatModel,
      model.shared.refs,
    )
    const newLinkPagin = LinkPagination.addOrUpdateDataHandler(
      logicConfig,
      currentChatModel.linkPagin,
      {
        dataSourceId: currentChatModel.linkPagin.mode.dataSourceId,
        value: [{ data: incomingChat, previousId: null }],
        compareId: (a, b) => a.id === b,
      },
    )

    const updatedChatModel: RoomChatPage.Model = {
      ...currentChatModel,
      linkPagin: newLinkPagin,
    }

    const newDict = upsertRoomChatPageDict(
      roomId,
      updatedChatModel,
      currentPageModel.roomChatPageDict,
    )

    const newPageModel: PageModel = {
      ...currentPageModel,
      roomChatPageDict: newDict,
    }

    return [
      {
        ...model,
        router: TeaRouter.setPageModel(model.router, newPageModel),
      },
      Cmd.none(),
    ]
  }

  return [model, Cmd.none()]
}

const simulateIncomingChatResponseGlobalEventHandler = (
  result: Result<Api.HttpErrorString, Api.Chat>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (result.tag === 'Err') {
    return [model, Cmd.none()]
  }

  return applyIncomingChat(result.value, model)
}

const simulateIncomingChatOtherRoomGlobalEventHandler = (
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentRoute = TeaRouter.getRoute(model.router)
  const activeRoomId = getActiveRoomId(currentRoute)

  return [
    model,
    attemptTE(
      Api.simulateIncomingChatToOtherRoom({ activeRoomId, latencyMs: 0 }),
      (result): Msg => ({
        _tag: 'SimulateIncomingChatOtherRoomResponseGlobalEvent',
        result,
      }),
    ),
  ]
}

const simulateIncomingChatOtherRoomResponseGlobalEventHandler = (
  result: Result<Api.HttpErrorString, { chat: Api.Chat; room: Api.Room }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (result.tag === 'Err') {
    return [model, Cmd.none()]
  }

  const { chat: incomingChat, room: updatedRoom } = result.value
  const currentPageModel = TeaRouter.getPageModel(model.router)
  const [updatedLinkPagin] = LinkPagination.replaceFuncHandler(
    currentPageModel.roomSidebar.roomList.linkPagin,
    {
      func: (overallData) => [
        SUA.fromArray(
          Api.RoomEq,
          Api.RoomOrd,
        )(
          overallData.value.map((r) =>
            r.id === updatedRoom.id ? updatedRoom : r,
          ),
        ),
        null,
      ],
      containerChangeEvent: { _tag: 'ElementModifyInPlace' },
    },
  )

  const updatedRoomSidebar = {
    ...currentPageModel.roomSidebar,
    roomList: {
      ...currentPageModel.roomSidebar.roomList,
      linkPagin: updatedLinkPagin,
    },
  }

  const newPageModel: PageModel = {
    ...currentPageModel,
    roomSidebar: updatedRoomSidebar,
  }

  return applyIncomingChat(incomingChat, {
    ...model,
    router: TeaRouter.setPageModel(model.router, newPageModel),
  })
}

const clearCacheAndResetGlobalEventHandler = (
  model: Model,
): [Model, Cmd<Msg>] => {
  Api.clearCachedRooms()
  Api.clearCachedChats()

  const currentRoute = TeaRouter.getRoute(model.router)

  // Force re-initialize the page model
  const [newRouterModel, routerCmd] = TeaRouter.init(
    routerConfig,
    window.location,
    model.shared,
  )

  const [routeModel, routeCmd] = teaRouterMsgHandler(
    { _tag: 'ChangeRoute', route: currentRoute },
    { ...model, router: newRouterModel },
  )

  return [
    routeModel,
    Cmd.batch([
      routerCmd,
      routeCmd,
      attemptTE(Api.resetDatabase(), (): Msg => ({ _tag: 'NoOp' })),
    ]),
  ]
}

const reloadActiveRoomGlobalEventHandler = (
  model: Model,
): [Model, Cmd<Msg>] => {
  const currentRoute = TeaRouter.getRoute(model.router)
  const roomId = getActiveRoomId(currentRoute)

  Api.clearCachedChats(roomId)

  return teaRouterMsgHandler(
    { _tag: 'ChangeRoute', route: currentRoute },
    model,
  )
}

const setNetworkLatencyGlobalEventHandler = (
  ms: number,
  model: Model,
): [Model, Cmd<Msg>] => {
  const newDebugPanel = { ...model.debugPanel, networkLatencyMs: ms }
  const newShared = { ...model.shared, latencyMs: ms }
  return [
    { ...model, debugPanel: newDebugPanel, shared: newShared },
    Cmd.none(),
  ]
}

const toggleNetworkOnlineGlobalEventHandler = (
  model: Model,
): [Model, Cmd<Msg>] => {
  const newOnline = !model.debugPanel.networkOnline
  const newDebugPanel = { ...model.debugPanel, networkOnline: newOnline }
  const newShared = { ...model.shared, networkOnline: newOnline }
  return [
    { ...model, debugPanel: newDebugPanel, shared: newShared },
    Cmd.none(),
  ]
}

export const subscriptions = (model: Model): Sub<Msg> => {
  const pageModel = TeaRouter.getPageModel(model.router)
  const currentRoute = TeaRouter.getRoute(model.router)

  const sidebarSub = RoomSidebar.subscriptions(pageModel.roomSidebar).map(
    (subMsg): Msg => ({ _tag: 'RoomSidebarMsg', subMsg }),
  )

  const activeRoomId =
    currentRoute.page._tag === 'RoomChatPage'
      ? currentRoute.page.roomId
      : undefined

  const activeChatPage = activeRoomId
    ? pageModel.roomChatPageDict.get(activeRoomId)
    : undefined

  const chatSub =
    activeChatPage && activeRoomId
      ? RoomChatPage.subscriptions(activeChatPage).map(
          (subMsg): Msg => ({
            _tag: 'RoomChatPageMsg',
            roomId: activeRoomId,
            subMsg,
          }),
        )
      : Sub.none<Msg>()

  return Sub.batch([sidebarSub, chatSub])
}
