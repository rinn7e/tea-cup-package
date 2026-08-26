import type { Dispatcher } from 'tea-cup-fp'

import type { HomeTab } from '@/common/route'
import type { Shared } from '@/common/shared'

export type Model = {
  readonly tab: HomeTab
  readonly page: number
  readonly counter: number
  readonly notes: string
}

export type Msg =
  | { readonly _tag: 'Increment' }
  | { readonly _tag: 'ChangeNotes'; readonly notes: string }
  | { readonly _tag: 'ChangeTab'; readonly tab: HomeTab }
  | { readonly _tag: 'ChangePage'; readonly page: number }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
