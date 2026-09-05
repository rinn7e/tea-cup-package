import { type Room } from '../../api'
import type * as RoomList from './sub-component/room-list/type'

export type Model = {
  readonly roomList: RoomList.Model
  readonly totalRoomsCount: number
  readonly filterQuery: string
}

export type Msg =
  | {
      readonly _tag: 'RoomListMsg'
      readonly subMsg: RoomList.Msg
    }
  | { readonly _tag: 'SetFilterQuery'; readonly query: string }
  | { readonly _tag: 'NoOp' }

export type Props = {
  readonly model: Model
  readonly activeRoom: Room | undefined
  readonly activeRoomId: string | undefined
  readonly dispatch: (msg: Msg) => void
}
