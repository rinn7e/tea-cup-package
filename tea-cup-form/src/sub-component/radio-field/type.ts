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
import * as EqClass from 'fp-ts/lib/Eq'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

/** Reducer messages for RadioField sub-component */
export type Msg =
  | {
      _tag: 'UpdateRadio'
      radioKey: string
      allowUnselected: boolean
    }

/** Choice item representing key, label, and description for a radio option */
export type RadioChoice = { key: string; label: string; desc: string }
export const RadioChoiceEq = EqClass.struct<RadioChoice>({
  key: S.Eq,
  label: S.Eq,
  desc: S.Eq,
})

/** Properties passed to custom UI renderer for an individual radio option */
export type RadioTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  radioChoice: RadioChoice
  isActive: boolean
}

/** Properties passed to custom UI renderer for the entire RadioField group */
export type RadiosTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  label: string
  choices: RadioChoice[]
  currentValue: Option<string>
  isMarkdown: boolean
}

/** Internal model state for RadioField */
export type Model = {
  // State
  currentValue: Option<string>

  // Config
  label: string
  choices: RadioChoice[]
  isMarkdown: boolean
  ui?: (arg: RadiosTypeUiArg) => JSX.Element
}

export const defaultModel = (
  choices: RadioChoice[],
  currentValue: Option<string>,
  inputUi?: (arg: RadiosTypeUiArg) => JSX.Element,
): Model => ({
  // State
  currentValue,

  // Config
  label: '',
  choices,
  isMarkdown: false,
  ui: inputUi ? inputUi : undefined,
})

export const ModelEq = EqClass.struct<Model>({
  // State
  currentValue: O.getEq(S.Eq),

  // Config
  label: S.Eq,
  choices: A.getEq(RadioChoiceEq),
  isMarkdown: { equals: () => true },
  ui: { equals: () => true },
})

/** Component props for RadioField */
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
