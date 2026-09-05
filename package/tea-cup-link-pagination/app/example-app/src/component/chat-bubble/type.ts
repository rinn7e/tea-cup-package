import { type Chat } from '../../api'
import { type ChatItemMsg } from '../../page/room-chat/type'

export type Props = {
  readonly chat: Chat
  readonly isSelected: boolean
  readonly isFirstUnread?: boolean
  readonly dispatch: (msg: ChatItemMsg) => void
}
