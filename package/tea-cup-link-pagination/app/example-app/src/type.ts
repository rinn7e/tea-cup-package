import type * as TeaRouter from '@rinn7e/tea-cup-router'
import { type Result } from 'tea-cup-fp'

import { type Chat, type HttpErrorString, type Room } from './api'
import { type AppRoute } from './common/route/type'
import { type Shared } from './common/router'
import { type PageModel } from './common/type/page-model'
import type * as DebugPanel from './component/debug-panel/type'
import type * as RoomDetailModal from './component/room-detail-modal/type'
import type * as RoomSidebar from './component/room-sidebar/type'
import type * as RoomChatPage from './page/room-chat/type'
import type * as RoomDraftPage from './page/room-draft/type'

export type Model = {
  readonly router: TeaRouter.Model<AppRoute, PageModel>
  readonly debugPanel: DebugPanel.Model
  readonly shared: Shared
}

export type Msg =
  // Tea router
  | { readonly _tag: 'TeaRouterMsg'; readonly subMsg: TeaRouter.Msg<AppRoute> }

  // Component messages
  | { readonly _tag: 'RoomSidebarMsg'; readonly subMsg: RoomSidebar.Msg }
  | {
      readonly _tag: 'RoomDetailModalMsg'
      readonly subMsg: RoomDetailModal.Msg
    }
  | { readonly _tag: 'DebugPanelMsg'; readonly subMsg: DebugPanel.Msg }
  | {
      readonly _tag: 'RoomChatPageMsg'
      readonly roomId: string
      readonly subMsg: RoomChatPage.Msg
    }
  | { readonly _tag: 'RoomDraftPageMsg'; readonly subMsg: RoomDraftPage.Msg }

  // Global events
  | { readonly _tag: 'MarkRoomAsReadGlobalEvent'; readonly roomId: string }
  | {
      readonly _tag: 'MarkRoomAsReadResponseGlobalEvent'
      readonly roomId: string
      readonly result: Result<HttpErrorString, Room>
    }
  | {
      readonly _tag: 'SimulateIncomingChatGlobalEvent'
      readonly roomId?: string
    }
  | {
      readonly _tag: 'SimulateIncomingChatResponseGlobalEvent'
      readonly result: Result<HttpErrorString, Chat>
    }
  | { readonly _tag: 'SimulateIncomingChatOtherRoomGlobalEvent' }
  | {
      readonly _tag: 'SimulateIncomingChatOtherRoomResponseGlobalEvent'
      readonly result: Result<HttpErrorString, { chat: Chat; room: Room }>
    }
  | { readonly _tag: 'ClearCacheAndResetGlobalEvent' }
  | { readonly _tag: 'ReloadActiveRoomGlobalEvent' }
  | { readonly _tag: 'SetNetworkLatencyGlobalEvent'; readonly ms: number }
  | { readonly _tag: 'ToggleNetworkOnlineGlobalEvent' }
  | { readonly _tag: 'NoOp' }
