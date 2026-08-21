import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly username: string
  readonly email: string
}

export type Msg =
  | { readonly _tag: 'SetUsername'; readonly username: string }
  | { readonly _tag: 'SetEmail'; readonly email: string }
  | { readonly _tag: 'Submit' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
