import * as EqClass from 'fp-ts/lib/Eq'
import * as RA from 'fp-ts/lib/ReadonlyArray'
import * as S from 'fp-ts/lib/string'

// A small TEA component living inside the drawer payload (`internal`): its
// state is created when the drawer opens and dropped when it has closed.
export type Page = 'Main' | 'MoveTo'

export type Folders =
  | { _tag: 'NotAsked' }
  | { _tag: 'Loading' }
  | { _tag: 'Loaded'; folders: readonly string[] }

export const FoldersEq: EqClass.Eq<Folders> = {
  equals: (x, y) => {
    switch (x._tag) {
      case 'NotAsked':
      case 'Loading':
        return y._tag === x._tag
      case 'Loaded':
        return (
          y._tag === 'Loaded' && RA.getEq(S.Eq).equals(x.folders, y.folders)
        )
    }
  },
}

export type Model = {
  // The message the menu was opened for: the payload's identity
  messageId: string
  page: Page
  query: string
  // Loaded on the first visit to "Move to"
  folders: Folders
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  messageId: S.Eq,
  page: S.Eq,
  query: S.Eq,
  folders: FoldersEq,
})

export type Msg =
  | { _tag: 'GoTo'; page: Page }
  | { _tag: 'SetQuery'; query: string }
  | { _tag: 'FoldersLoaded'; folders: readonly string[] }
  // Handled by the parent: move the message and close the drawer
  | { _tag: 'Pick'; folder: string }
