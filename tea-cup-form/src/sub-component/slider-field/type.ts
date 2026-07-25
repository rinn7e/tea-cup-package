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
import { type JSX, type ReactNode } from 'react'
import { Dispatcher } from 'tea-cup-fp'

export type SliderTypeUiArg<MsgType = Msg> = {
  dispatch: Dispatcher<MsgType>
  fieldKey: string
  value: number
  isDragging: boolean
  min: number
  max: number
  step: number
  label: string
  unit?: string
  showValue: boolean
  id: string
  anchorName: string
  customThumbView?: (props: {
    pct: number
    anchorName: string
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }) => ReactNode
}

export type Config = {
  min: number
  max: number
  step: number
  label?: string
  unit?: string
  showValue?: boolean
  customThumbView?: (props: {
    pct: number
    anchorName: string
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }) => ReactNode
  ui?: (props: SliderTypeUiArg<Msg>) => JSX.Element
  // The HTML id of the track element, used to measure track dimensions during dragging
  id: string
  // The CSS anchor-name of the slider thumb, used to anchor floating tooltips (if needed) to it
  anchorName: string
}

export type Model = {
  value: number
  isDragging: boolean
  ui?: (props: SliderTypeUiArg<Msg>) => JSX.Element
}

export const defaultModel = (
  initialValue: number,
  inputUi?: (props: SliderTypeUiArg<Msg>) => JSX.Element,
): Model => ({
  value: initialValue,
  isDragging: false,
  ui: inputUi,
})

export const ModelEq = EqClass.struct<Model>({
  value: N.Eq,
  isDragging: B.Eq,
  ui: EqAlways,
})

export type Msg =
  | { _tag: 'SetDragging'; value: boolean }
  | { _tag: 'SetValue'; value: number }
  | { _tag: 'NoOp' }

export const ConfigEq = EqClass.struct<Config>({
  min: N.Eq,
  max: N.Eq,
  step: N.Eq,
  label: EqAlways,
  unit: EqAlways,
  showValue: EqAlways,
  customThumbView: EqAlways,
  ui: EqAlways,
  id: S.Eq,
  anchorName: S.Eq,
})

export type Props = {
  fieldKey?: string
  model: Model
  dispatch: Dispatcher<Msg>
  config: Config
}

export const PropsEq = EqClass.struct<Props>({
  fieldKey: EqAlways,
  model: ModelEq,
  dispatch: EqAlways,
  config: ConfigEq,
})

export type SliderType = {
  _tag: 'SliderType'
  model: Model
  config: Config
}

export const SliderTypeEq = EqClass.struct<SliderType>({
  _tag: S.Eq,
  model: ModelEq,
  config: ConfigEq,
})
