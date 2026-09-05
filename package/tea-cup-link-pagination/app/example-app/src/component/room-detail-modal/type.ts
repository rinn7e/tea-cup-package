import { type User } from '../../api'
import { type RightSidebarTab } from '../../common/route/type'

export type Model = {
  readonly activeTab: RightSidebarTab
  readonly selectedMemberId: string | null
}

export type Msg =
  | { readonly _tag: 'SetTab'; readonly tab: RightSidebarTab }
  | { readonly _tag: 'SelectMember'; readonly userId: string | null }

export type Props = {
  readonly model: Model
  readonly activeRoom:
    | { id: string; name: string; topic: string; membersCount: number }
    | undefined
  readonly users: User[]
  readonly dispatch: (msg: Msg) => void
}
