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
import { type Either } from 'fp-ts/lib/Either'
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

import type { Forms } from '../../type'

// ------------------------------------------
// Msg
// ------------------------------------------

export type Msg =
  | { _tag: 'UpdateValue'; value: string }
  | { _tag: 'UpdateEvent'; event: FormEvent<HTMLInputElement | HTMLTextAreaElement> }
  | { _tag: 'SetRevealPassword'; reveal: boolean; event: MouseEvent<HTMLElement> }
  | { _tag: 'HandleFocus'; isFocus: boolean }
  | { _tag: 'HideValidation' }

// ------------------------------------------
// Text input variant
// ------------------------------------------

export type TextInputVariant =
  | { _tag: 'Text' }
  | { _tag: 'Email' }
  | { _tag: 'Password'; reveal: boolean }

export const TextInputVariantEq: EqClass.Eq<TextInputVariant> = {
  equals: (x, y) => {
    if (x._tag === 'Text' && y._tag === 'Text') return true
    else if (x._tag === 'Email' && y._tag === 'Email') return true
    else if (x._tag === 'Password' && y._tag === 'Password')
      return EqClass.struct({
        _tag: S.Eq,
        reveal: B.Eq,
      }).equals(x, y)
    else return false
  },
}

export const textInputVariantToString = (variant: TextInputVariant) => {
  switch (variant._tag) {
    case 'Text':
      return 'text'
    case 'Email':
      return 'email'
    case 'Password': {
      if (variant.reveal) return 'text'
      else return 'password'
    }
  }
}

// ------------------------------------------
// Model
// ------------------------------------------

export type Model = {
  placeholder: string
  label: string
  currentValue: string
  validation: (input: string) => Either<string, string>
  linkValidations: {
    linkKey: string
    validation: (
      currentInput: string,
      linkInput: string,
    ) => Either<string, string>
  }[]
  showValidation: boolean
  isTextarea: boolean
  variant: TextInputVariant
  autocomplete: boolean
  isFocus: boolean
  onKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
  ui?: (props: TextTypeUiArg) => JSX.Element
}

export type TextTypeUiArg = {
  key: string
  label: string
  isFocus: boolean
  placeholder?: string
  currentValue: string
  showValidation: boolean
  dispatch: Dispatcher<Msg>
  validationResult: Either<string, string>
  validation: (input: string) => Either<string, string>
  variant: TextInputVariant
  autocomplete: boolean
  isTextarea: boolean
  onKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
}

export const ModelEq = EqClass.struct<Model>({
  placeholder: S.Eq,
  label: S.Eq,
  currentValue: S.Eq,
  validation: { equals: () => true },
  linkValidations: { equals: () => true },
  showValidation: B.Eq,
  isTextarea: B.Eq,
  variant: TextInputVariantEq,
  autocomplete: B.Eq,
  isFocus: B.Eq,
  onKeyDown: { equals: () => true },
  ui: { equals: () => true },
})

export const autocompleteToString = (val: boolean) => {
  if (!val) return 'new-password'
  else return 'on'
}

// ------------------------------------------
// Props
// ------------------------------------------

export type Props = {
  fieldKey: string
  model: Model
  dispatch: Dispatcher<Msg>
  forms: Forms
}

export const PropsEq = EqClass.struct<Props>({
  fieldKey: S.Eq,
  model: ModelEq,
  dispatch: { equals: () => true },
  forms: { equals: () => true },
})
