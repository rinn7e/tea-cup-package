import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import * as RA from 'fp-ts/lib/ReadonlyArray'
import * as S from 'fp-ts/lib/string'

// The "Move to" screen: a TEA component living in a screen of the stack.
// Its state is created when the screen is pushed and dropped when it is
// popped.
export type Model = {
  // `none` while loading
  folders: O.Option<readonly string[]>
  query: string
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  folders: O.getEq(RA.getEq(S.Eq)),
  query: S.Eq,
})

export type Msg =
  | { _tag: 'FoldersLoaded'; folders: readonly string[] }
  | { _tag: 'SetQuery'; query: string }
  // Handled by the parent: move the message and close the drawer
  | { _tag: 'Pick'; folder: string }
  // Handled by the parent: push the "New folder" screen
  | { _tag: 'NewFolder' }
