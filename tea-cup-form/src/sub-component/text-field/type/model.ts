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
import type { Either } from 'fp-ts/lib/Either'
import * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { Dispatcher } from 'tea-cup-fp'

// ------------------------------------------
// Helper types & definitions
// ------------------------------------------

/** Input variant for text field (e.g. plain Text, Email, or Password with reveal state) */
export type TextInputVariant =
  | { _tag: 'Text' }
  | { _tag: 'Email' }
  | { _tag: 'Password'; reveal: boolean }

export const textInputVariantToString = (
  variant: TextInputVariant,
): string => {
  switch (variant._tag) {
    case 'Text':
      return 'text'

    case 'Email':
      return 'email'

    case 'Password':
      return variant.reveal ? 'text' : 'password'
  }
}

export const TextInputVariantEq: EqClass.Eq<TextInputVariant> = {
  equals: (a, b) => {
    if (a._tag === 'Text' && b._tag === 'Text') return true
    if (a._tag === 'Email' && b._tag === 'Email') return true
    if (a._tag === 'Password' && b._tag === 'Password')
      return a.reveal === b.reveal
    return false
  },
}

export const autocompleteToString = (val: boolean): string => {
  if (!val) return 'new-password'
  else return 'on'
}

/** Properties passed to custom UI renderers for TextField */
export type TextTypeUiArg<MsgType = Msg> = {
  dispatch: Dispatcher<MsgType>
  variant: TextInputVariant
  key: string
  currentValue: string
  label: string
  showValidation: boolean
  isFocus: boolean
  validationResult: Either<string, string>
  validation: (input: string) => Either<string, string>
  placeholder?: string
  autocomplete: boolean
  isTextarea: boolean
  onKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
}

// ------------------------------------------
// Msg
// ------------------------------------------

/** Reducer messages for TextField sub-component */
export type Msg =
  | { _tag: 'UpdateValue'; value: string }
  | { _tag: 'UpdateEvent'; event: FormEvent<HTMLInputElement | HTMLTextAreaElement> }
  | { _tag: 'SetRevealPassword'; reveal: boolean; event: MouseEvent<HTMLElement> }
  | { _tag: 'HandleFocus'; isFocus: boolean }
  | { _tag: 'HideValidation' }

// ------------------------------------------
// Model
// ------------------------------------------

/** Internal model state for TextField */
export type Model = {
  // State
  currentValue: string
  showValidation: boolean
  isFocus: boolean
  variant: TextInputVariant

  // Config
  label: string
  placeholder: string
  validation: (input: string) => Either<string, string>
  linkValidations: {
    linkKey: string
    validation: (
      currentInput: string,
      linkInput: string,
    ) => Either<string, string>
  }[]
  isTextarea: boolean
  autocomplete: boolean
  onKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
  ui?: (props: TextTypeUiArg<Msg>) => JSX.Element
}

export const defaultModel = (
  inputUi?: (props: TextTypeUiArg<Msg>) => JSX.Element,
): Model => ({
  // State
  currentValue: '',
  showValidation: false,
  isFocus: false,
  variant: { _tag: 'Text' },

  // Config
  label: 'Username',
  placeholder: 'Username',
  validation: (val) => E.right(val),
  linkValidations: [],
  isTextarea: false,
  autocomplete: false,
  ui: inputUi ? inputUi : undefined,
})

export const ModelEq = EqClass.struct<Model>({
  // State
  currentValue: S.Eq,
  showValidation: B.Eq,
  isFocus: B.Eq,
  variant: TextInputVariantEq,

  // Config
  label: S.Eq,
  placeholder: S.Eq,
  validation: { equals: () => true },
  linkValidations: { equals: () => true },
  isTextarea: B.Eq,
  autocomplete: B.Eq,
  onKeyDown: { equals: () => true },
  ui: { equals: () => true },
})
