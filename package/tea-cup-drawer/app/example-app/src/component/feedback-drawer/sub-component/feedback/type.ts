import * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

// A TEA form living side by side with its drawer: the parent owns it, so it
// survives the drawer closing (option A). It reaches the drawer through the
// `parent` channel.
export type Model = {
  rating: number
  comment: string
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct<Model>({
  rating: N.Eq,
  comment: S.Eq,
})

export type Msg =
  | { _tag: 'SetRating'; rating: number }
  | { _tag: 'SetComment'; comment: string }
  // Handled by the parent: send, close the drawer, clear once closed
  | { _tag: 'Submit' }
