import * as EqClass from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/lib/string'

// The "New folder" screen, pushed on top of "Move to"
export type Model = { name: string }

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  name: S.Eq,
})

export type Msg =
  | { _tag: 'SetName'; name: string }
  // Handled by the parent: log it and go back to "Move to"
  | { _tag: 'Create' }
