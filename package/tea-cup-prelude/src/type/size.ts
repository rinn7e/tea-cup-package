import * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

// Size
// -----------------------------------------------------------------
export type Size = { _tag: 'Size'; value: number }
export const SizeEq: EqClass.Eq<Size> = EqClass.struct({
  _tag: S.Eq,
  value: N.Eq,
})
export const size = (value: number): Size => ({ _tag: 'Size', value })
export const defaultPageSize = 25
