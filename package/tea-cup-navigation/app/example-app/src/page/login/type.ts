import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly email: string
  readonly isSubmitting: boolean
}

export type Msg =
  | { readonly _tag: 'SetEmail'; readonly email: string }
  | { readonly _tag: 'Submit' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
