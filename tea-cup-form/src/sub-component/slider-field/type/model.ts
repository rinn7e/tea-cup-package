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
import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

export type Config = {
  min: number
  max: number
  step: number
  label?: string
  unit?: string
  showValue?: boolean
  anchorName?: string
  ui?: (props: SliderTypeUiArg<Msg>) => JSX.Element
}

export const ConfigEq: EqClass.Eq<Config> = EqAlways

export type ThumbViewUiArg<MsgType = Msg> = {
  fieldKey: string
  anchorName: string
  pct: number
  isDragging: boolean
  dispatch: Dispatcher<MsgType>
}

export type SliderTypeUiArg<MsgType = Msg> = {
  dispatch: Dispatcher<MsgType>
  fieldKey: string
  value: number
  isDragging: boolean
  config: Config
}

export type Model = {
  // State
  value: number
  isDragging: boolean

  // Config
  config: Config
}

export const defaultModel = (config: Config, initialValue: number): Model => ({
  // State
  value: initialValue,
  isDragging: false,

  // Config
  config,
})

export const ModelEq = EqClass.struct<Model>({
  value: N.Eq,
  isDragging: B.Eq,
  config: ConfigEq,
})

export type Msg =
  | { _tag: 'SetDragging'; value: boolean }
  | { _tag: 'SetValue'; value: number }
  | { _tag: 'NoOp' }

export type SliderType = {
  _tag: 'SliderType'
  model: Model
}

export const SliderTypeEq = EqClass.struct<SliderType>({
  _tag: S.Eq,
  model: ModelEq,
})
