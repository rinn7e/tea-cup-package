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
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import type { JSX, ReactNode } from 'react'
import { Dispatcher } from 'tea-cup-fp'

export type Config<A = any> = {
  handler: (query: string) => any
  chipView?: (item: A) => ReactNode
  resultView?: (item: A) => ReactNode
  labelText: string
  notFoundText: string
  itemEq: EqClass.Eq<A>
  getKey: (item: A) => string | number
}

export type Model<A = any> = {
  // State
  query: string
  items: RD.RemoteData<string, A[]>
  selectedItems: A[]
  timerId: number
  showValidation: boolean
  isFocus: boolean

  // Config
  config: Config<A>
  label: string
  placeholder: string
  validation: (val: A[]) => Either<string, A[]>
  ui?: (arg: ComboboxTypeUiArg<A>) => JSX.Element
}

export const defaultModel = <A = any>(
  config: Config<A>,
  selectedItems: A[] = [],
  inputUi?: (arg: ComboboxTypeUiArg<A>) => JSX.Element,
): Model<A> => ({
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

export const ModelEq = <A>(itemEq: EqClass.Eq<A>): EqClass.Eq<Model<A>> =>
  EqClass.struct<Model<A>>({
    // State
    query: S.Eq,
    items: RD.getEq(S.Eq, A.getEq(itemEq)),
    selectedItems: A.getEq(itemEq),
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

export type Msg<A = any> =
  | { _tag: 'SetQuery'; value: string }
  | { _tag: 'SetItems'; value: RD.RemoteData<string, A[]>; timerId: number }
  | { _tag: 'SetSelectedItems'; items: A[] }
  | { _tag: 'DeselectItem'; item: A }
  | { _tag: 'SelectItem'; item: A }
  | { _tag: 'DebouncedSearch'; query: string; timerId: number }
  | { _tag: 'HandleFocus'; isFocus: boolean }
  | { _tag: 'HideValidation' }

export type ComboboxTypeUiArg<A = any> = {
  dispatch: Dispatcher<Msg<A>>
  key: string
  query: string
  items: RD.RemoteData<string, A[]>
  selectedItems: A[]
  label: string
  placeholder: string
  showValidation: boolean
  isFocus: boolean
  validationResult: Either<string, A[]>
  config: Config<A>
}

export type Props<A = any> = {
  fieldKey: string
  model: Model<A>
  dispatch: Dispatcher<Msg<A>>
}

export const PropsEq = <A>(itemEq: EqClass.Eq<A>): EqClass.Eq<Props<A>> =>
  EqClass.struct<Props<A>>({
    fieldKey: S.Eq,
    model: ModelEq(itemEq),
    dispatch: EqAlways,
  })
