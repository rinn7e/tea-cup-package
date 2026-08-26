import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly bio: string
}

export type Msg =
  | { readonly _tag: 'SetBio'; readonly bio: string }
  | { readonly _tag: 'Logout' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
