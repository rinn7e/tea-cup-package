import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly slug: string
  readonly commentsCount: number
}

export type Msg = { readonly _tag: 'AddComment' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
