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
import * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { type FormEvent, type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

/** Reducer messages for TextPillField sub-component */
export type Msg =
  | {
      _tag: 'UpdateTextPill'
      event: FormEvent<HTMLInputElement | HTMLTextAreaElement>
    }
  | {
      _tag: 'AddPill'
      value: string
    }
  | {
      _tag: 'RemovePill'
      index: number
    }
  | {
      _tag: 'HandleFocus'
      isFocus: boolean
    }
  | {
      _tag: 'HideValidation'
    }

/** Internal model state for TextPillField */
export type Model = {
  // State
  currentValue: string
  allValues: string[]
  showValidation: boolean
  isFocus: boolean

  // Config
  label: string
  placeholder: string
  validation: (input: string[]) => Either<string, string[]>
  isTextarea: boolean
  autocomplete: boolean
  ui?: (props: TextPillTypeUiArg) => JSX.Element
}

/** Properties passed to custom UI renderers for TextPillField */
export type TextPillTypeUiArg = {
  key: string
  label: string
  isFocus: boolean
  placeholder?: string
  allValues: string[]
  currentValue: string
  showValidation: boolean
  dispatch: Dispatcher<Msg>
  validationResult: Either<string, string[]>
  validation: (input: string[]) => Either<string, string[]>
  autocomplete: boolean
  isTextarea: boolean
}

export const defaultModel = (
  inputUi?: (props: TextPillTypeUiArg) => JSX.Element,
): Model => ({
  // State
  currentValue: '',
  allValues: [],
  showValidation: false,
  isFocus: false,

  // Config
  label: 'Tags',
  placeholder: 'Add tag...',
  validation: (val) => E.right(val),
  isTextarea: false,
  autocomplete: false,
  ui: inputUi ? inputUi : undefined,
})

export const ModelEq = EqClass.struct<Model>({
  // State
  currentValue: S.Eq,
  allValues: A.getEq(S.Eq),
  showValidation: B.Eq,
  isFocus: B.Eq,

  // Config
  label: S.Eq,
  placeholder: S.Eq,
  validation: { equals: () => true },
  isTextarea: B.Eq,
  autocomplete: B.Eq,
  ui: { equals: () => true },
})

/** Component props for TextPillField */
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
