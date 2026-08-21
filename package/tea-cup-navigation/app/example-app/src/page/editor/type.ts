import type { Dispatcher } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

export type Model = {
  readonly slug?: string
  readonly title: string
  readonly body: string
}

export type Msg =
  | { readonly _tag: 'SetTitle'; readonly title: string }
  | { readonly _tag: 'SetBody'; readonly body: string }
  | { readonly _tag: 'Submit' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
