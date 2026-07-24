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
import * as D from 'fp-ts/lib/Date'
import { type Either } from 'fp-ts/lib/Either'
import * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

import { NullableEq } from '@rinn7e/tea-cup-prelude'

/** Reducer messages for CalendarField sub-component */
export type Msg =
  | {
      _tag: 'UpdateCalendar'
      value: Date | null
    }
  | {
      _tag: 'HandleFocus'
      isFocus: boolean
    }
  | {
      _tag: 'HideValidation'
    }

/** Properties passed to custom UI renderer for CalendarField */
export type CalendarTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  label: string
  placeholder: string
  currentValue: Date | null
  isFocus: boolean
  validationResult: Either<string, Date | null>
  validation: (input: Date | null) => Either<string, Date | null>
  showValidation: boolean
}

/** Internal model state for CalendarField */
export type Model = {
  // State
  currentValue: Date | null
  showValidation: boolean
  isFocus: boolean

  // Config
  label: string
  placeholder: string
  validation: (input: Date | null) => Either<string, Date | null>
  ui?: (arg: CalendarTypeUiArg) => JSX.Element
}

export const defaultModel = (
  inputUi?: (arg: CalendarTypeUiArg) => JSX.Element,
): Model => ({
  // State
  currentValue: null,
  showValidation: false,
  isFocus: false,

  // Config
  label: 'Birthday',
  placeholder: 'Select date',
  validation: (val) => E.right(val),
  ui: inputUi ? inputUi : undefined,
})

export const ModelEq = EqClass.struct<Model>({
  // State
  currentValue: NullableEq(D.Eq),
  showValidation: B.Eq,
  isFocus: B.Eq,

  // Config
  label: S.Eq,
  placeholder: S.Eq,
  validation: { equals: () => true },
  ui: { equals: () => true },
})

/** Component props for CalendarField */
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
