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
import { type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

export type Msg =
  | {
      _tag: 'ToggleCheckbox'
      checkboxKey: string
      value: boolean
    }

export type CheckboxChoice = [string, boolean]
export const CheckboxChoiceEq = EqClass.tuple(S.Eq, B.Eq)

export type CheckboxesTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  label: string
  currentValues: CheckboxChoice[]
  isMarkdown: boolean
}

export type Model = {
  label: string
  currentValues: CheckboxChoice[]
  validation: (input: CheckboxChoice[]) => Either<string, CheckboxChoice[]>
  isMarkdown: boolean
  ui?: (arg: CheckboxesTypeUiArg) => JSX.Element
}

export const ModelEq = EqClass.struct<Model>({
  label: S.Eq,
  currentValues: A.getEq(CheckboxChoiceEq),
  validation: { equals: () => true },
  isMarkdown: { equals: () => true },
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
