/* MIT License

Copyright (c) 2025 Moremi Vannak

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
import { type Either } from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { type JSX, type MouseEvent } from 'react'
import { Dispatcher } from 'tea-cup-fp'

import { NullableEq } from '../../util/common'

export type Msg =
  | {
      _tag: 'UpdateDropdownType'
      value: string
      event?: MouseEvent<HTMLDivElement>
    }
  | {
      _tag: 'HandleFocus'
      isFocus: boolean
    }
  | {
      _tag: 'HideValidation'
    }

export type DropdownTypeUiArg = {
  dispatch: Dispatcher<Msg>
  label: string
  currentValue: string | null
  placeholder: string
  fieldKey: string
  isFocus: boolean
  choices: string[]
  validationResult: Either<string, string | null>
  validation: (input: string | null) => Either<string, string | null>
  showValidation: boolean
}

export type Model = {
  label: string
  placeholder: string
  choices: string[]
  currentValue: string | null
  validation: (input: string | null) => Either<string, string | null>
  showValidation: boolean
  isFocus: boolean
  ui?: (arg: DropdownTypeUiArg) => JSX.Element
}

export const ModelEq = EqClass.struct<Model>({
  label: { equals: () => true },
  placeholder: { equals: () => true },
  choices: A.getEq(S.Eq),
  currentValue: NullableEq(S.Eq),
  validation: { equals: () => true },
  showValidation: { equals: () => true },
  isFocus: B.Eq,
  ui: { equals: () => true },
})

export type Props = {
  fieldKey: string
  model: Model
  dispatch: Dispatcher<Msg>
}

export const PropsEq = EqClass.struct<Props>({
  fieldKey: S.Eq,
  model: ModelEq,
  dispatch: { equals: () => true },
})
