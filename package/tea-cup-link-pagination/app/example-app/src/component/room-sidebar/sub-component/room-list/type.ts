import type * as LinkPagination from '@rinn7e/tea-cup-link-pagination'

import { type Room } from '../../../../api'
import { type AppRoute } from '../../../../common/route/type'
import { type RoomItemMsg } from '../room-item/type'

export type { RoomItemMsg }

export type Model = {
  readonly linkPagin: LinkPagination.Model<Room>
  readonly refs: LinkPagination.Refs
  readonly expandedRoomIds: Set<string>
}

export type Msg =
  | {
      readonly _tag: 'LinkPaginMsg'
      readonly subMsg: LinkPagination.Msg<Room, RoomItemMsg, AppRoute>
    }
  | { readonly _tag: 'SelectRoom'; readonly roomId: string }
  | { readonly _tag: 'UpdateRoomSuccess'; readonly room: Room }
  | { readonly _tag: 'NoOp' }

export type ParentContext = {
  readonly activeRoomId: string | undefined
  readonly expandedRoomIds: Set<string>
  readonly dispatch: (msg: Msg) => void
}

export type Props = {
  readonly model: Model
  readonly activeRoomId: string | undefined
  readonly dispatch: (msg: Msg) => void
}
