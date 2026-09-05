import { type Room } from '../../../../api'

export type Model = {
  readonly isExpand: boolean
}

export type RoomItemMsg =
  | { readonly _tag: 'SelectRoom' }
  | { readonly _tag: 'MarkAsRead' }
  | { readonly _tag: 'ToggleFavorite' }
  | { readonly _tag: 'ToggleExpand' }

export type Props = {
  readonly model: Model
  readonly room: Room
  readonly isActive: boolean
  readonly dispatch: (msg: RoomItemMsg) => void
}
