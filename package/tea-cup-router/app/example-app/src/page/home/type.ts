import type { Dispatcher } from 'tea-cup-fp'

import type { HomeTab } from '@/common/route'
import type { Shared } from '@/common/shared'

export type Model = {
  readonly tab: HomeTab
  readonly page: number
  readonly counter: number
  readonly notes: string
  readonly isFirstInitialized: boolean
}

export type Msg =
  | { readonly _tag: 'Increment' }
  | { readonly _tag: 'ChangeNotes'; readonly notes: string }
  | { readonly _tag: 'ChangeTab'; readonly tab: HomeTab }
  | { readonly _tag: 'ChangePage'; readonly page: number }
  | { readonly _tag: 'ForceRefreshViaChangeRoute' }
  | { readonly _tag: 'SetIsFirstInitialized'; readonly value: boolean }
  | { readonly _tag: 'ModifyPageViaRouter' }
  | { readonly _tag: 'ModifyTabNoReloadViaRouter' }
  | { readonly _tag: 'ModifyUrlNoReloadViaRouter' }
  | { readonly _tag: 'RefreshViaRouter' }

export type Props = {
  readonly model: Model
  readonly shared: Shared
  readonly dispatch: Dispatcher<Msg>
}
