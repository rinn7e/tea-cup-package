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
import * as RD from '@devexperts/remote-data-ts'
import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import type { Either } from 'fp-ts/lib/Either'
import * as E from 'fp-ts/lib/Either'
import * as EqClass from 'fp-ts/lib/Eq'
import type { TaskEither } from 'fp-ts/lib/TaskEither'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import type { JSX, ReactNode } from 'react'
import { Dispatcher } from 'tea-cup-fp'

import {
  DataJson,
  DataJsonEq,
  ErrorJson,
  ErrorJsonEq,
} from '../../../common/data'

export type Config = {
  handler: (query: string) => TaskEither<ErrorJson, DataJson[]>
  chipView?: (item: DataJson) => ReactNode
  resultView?: (item: DataJson) => ReactNode
  labelText: string
  notFoundText: string
  itemEq: EqClass.Eq<DataJson>
  getKey: (item: DataJson) => string | number
}

export type Model = {
  // State
  query: string
  items: RD.RemoteData<ErrorJson, DataJson[]>
  selectedItems: DataJson[]
  timerId: number
  showValidation: boolean
  isFocus: boolean

  // Config
  config: Config
  label: string
  placeholder: string
  validation: (val: DataJson[]) => Either<string, DataJson[]>
  ui?: (arg: UiArg) => JSX.Element
}

export const defaultModel = (
  config: Config,
  selectedItems: DataJson[] = [],
  inputUi?: (arg: UiArg) => JSX.Element,
): Model => ({
  // State
  query: '',
  items: RD.initial,
  selectedItems,
  timerId: 0,
  showValidation: false,
  isFocus: false,

  // Config
  config,
  label: config.labelText,
  placeholder: 'Search...',
  validation: (val) => E.right(val),
  ui: inputUi,
})

export const ModelEq = EqClass.struct<Model>({
  // State
  query: S.Eq,
  items: RD.getEq(ErrorJsonEq, A.getEq(DataJsonEq)),
  selectedItems: A.getEq(DataJsonEq),
  timerId: N.Eq,
  showValidation: EqAlways,
  isFocus: EqAlways,

  // Config
  config: EqAlways,
  label: S.Eq,
  placeholder: S.Eq,
  validation: EqAlways,
  ui: EqAlways,
})

export type Msg =
  | { _tag: 'SetQuery'; value: string }
  | {
      _tag: 'SetItems'
      value: RD.RemoteData<ErrorJson, DataJson[]>
      timerId: number
    }
  | { _tag: 'SetSelectedItems'; items: DataJson[] }
  | { _tag: 'DeselectItem'; item: DataJson }
  | { _tag: 'SelectItem'; item: DataJson }
  | { _tag: 'DebouncedSearch'; query: string; timerId: number }
  | { _tag: 'HandleFocus'; isFocus: boolean }
  | { _tag: 'HideValidation' }

export type UiArg = {
  dispatch: Dispatcher<Msg>
  key: string
  query: string
  items: RD.RemoteData<ErrorJson, DataJson[]>
  selectedItems: DataJson[]
  label: string
  placeholder: string
  showValidation: boolean
  isFocus: boolean
  validationResult: Either<string, DataJson[]>
  config: Config
}
