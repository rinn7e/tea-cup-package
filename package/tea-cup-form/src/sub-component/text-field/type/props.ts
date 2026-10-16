/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'
import { Dispatcher } from 'tea-cup-fp'

import { type Forms, lookupFormSafe, valueTextType } from '../../../common/type'
import type { Model, Msg } from './model'
import { ModelEq } from './model'

// ------------------------------------------
// Props
// ------------------------------------------

/** Component props for TextField */
export type Props = {
  fieldKey: string
  model: Model
  dispatch: Dispatcher<Msg>
  forms: Forms
}

// The text of a linked field, as `runValidationAndLink` reads it
const linkedValue = (forms: Forms, key: string): O.Option<string> =>
  pipe(lookupFormSafe(key, forms), O.map(valueTextType))

// Only the fields this one validates against (`linkValidations`) matter:
// when one of them changes, the field re-renders so its error follows it
// (e.g. "Password does not match" clears once the new password matches).
const linkedFormsEq = (model: Model): EqClass.Eq<Forms> => ({
  equals: (x, y) =>
    pipe(
      model.linkValidations,
      A.every(({ linkKey }) =>
        O.getEq(S.Eq).equals(linkedValue(x, linkKey), linkedValue(y, linkKey)),
      ),
    ),
})

export const PropsEq: EqClass.Eq<Props> = {
  equals: (x, y) =>
    EqClass.struct<Props>({
      fieldKey: S.Eq,
      model: ModelEq,
      dispatch: { equals: () => true },
      forms: linkedFormsEq(y.model),
    }).equals(x, y),
}
