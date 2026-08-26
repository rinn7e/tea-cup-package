import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly username: string
  readonly favorites: boolean
  readonly count: number
}

export type Msg =
  | { readonly _tag: 'Increment' }
  | { readonly _tag: 'ToggleFavorites' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
