import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly _tag: 'NotFound'
}

export type Msg = { readonly _tag: 'NoOp' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
