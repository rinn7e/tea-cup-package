import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

// A small TEA component living inside the drawer payload (`internal`): its
// state is created when the drawer opens and dropped when it has closed.
export type Page = 'Main' | 'MoveTo'

export type Model = {
  page: Page
  query: string
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  page: S.Eq,
  query: S.Eq,
})

export type Msg =
  | { _tag: 'GoTo'; page: Page }
  | { _tag: 'SetQuery'; query: string }
  // Handled by the parent: move the message and close the drawer
  | { _tag: 'Pick'; folder: string }

export const folders = ['Inbox', 'Archive', 'Projects', 'Receipts', 'Travel']
