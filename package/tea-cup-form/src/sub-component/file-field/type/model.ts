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

/** Reducer messages for FileField sub-component */
export type Msg =
  | {
      _tag: 'AddFile'
      event: FormEvent<HTMLInputElement>
    }
  | {
      _tag: 'RemoveFile'
      index: number
    }
  | {
      _tag: 'HideValidation'
    }

/** Properties passed to custom UI renderer for FileField */
export type UiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  label: string
  currentValues: File[]
  validationResult: Either<string, File[]>
  isMultiple: boolean
  isDrag: boolean
  showValidation: boolean
}

/** Internal model state for FileField */
export type Model = {
  // State
  currentValues: File[]
  showValidation: boolean

  // Config
  label: string
  isMultiple: boolean
  validation: (input: File[]) => Either<string, File[]>
  ui?: (arg: UiArg) => JSX.Element
}

export const defaultModel = (inputUi?: (arg: UiArg) => JSX.Element): Model => ({
  // State
  currentValues: [],
  showValidation: false,

  // Config
  label: 'File Upload',
  isMultiple: true,
  validation: (val) => E.right(val),
  ui: inputUi ? inputUi : undefined,
})

export const FileEq: EqClass.Eq<File> = { equals: (a, b) => a.name === b.name }

export const ModelEq = EqClass.struct<Model>({
  // State
  currentValues: A.getEq(FileEq),
  showValidation: B.Eq,

  // Config
  label: S.Eq,
  isMultiple: { equals: () => true },
  validation: { equals: () => true },
  ui: { equals: () => true },
})
