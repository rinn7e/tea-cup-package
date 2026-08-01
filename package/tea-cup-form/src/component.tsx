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
import * as M from 'fp-ts/lib/Map'
import * as S from 'fp-ts/lib/string'
import { memo } from 'react'
import { Dispatcher, map } from 'tea-cup-fp'

import { type FormType } from './common/type'
import './form.css'
import * as CalendarField from './sub-component/calendar-field'
import { CalendarFieldMemo } from './sub-component/calendar-field/component'
import * as CheckboxField from './sub-component/checkbox-field'
import { CheckboxFieldMemo } from './sub-component/checkbox-field/component'
import * as ComboboxField from './sub-component/combobox-field'
import { ComboboxFieldMemo } from './sub-component/combobox-field/component'
import * as DropdownField from './sub-component/dropdown-field'
import { DropdownFieldMemo } from './sub-component/dropdown-field/component'
import * as FileField from './sub-component/file-field'
import { FileFieldMemo } from './sub-component/file-field/component'
import * as RadioField from './sub-component/radio-field'
import { RadioFieldMemo } from './sub-component/radio-field/component'
import * as SliderField from './sub-component/slider-field'
import { SliderFieldMemo } from './sub-component/slider-field/component'
import * as TextField from './sub-component/text-field'
import { TextFieldMemo } from './sub-component/text-field/component'
import * as TextPillField from './sub-component/text-pill-field'
import { TextPillFieldMemo } from './sub-component/text-pill-field/component'
import { type Model, type Msg, PropEq, type Props } from './type'

// UI for individual input field
// Model is needed to do validation on input field that depend on another input field
const formView = (
  key: string,
  val: FormType,
  dispatch: Dispatcher<Msg>,
  model: Model,
) => {
  switch (val._tag) {
    case 'TextType':
      return (
        <TextFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: TextField.Msg) =>
              ({
                _tag: 'TextFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
          forms={model.forms}
        />
      )
    case 'TextPillType':
      return (
        <TextPillFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: TextPillField.Msg) =>
              ({
                _tag: 'TextPillFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'CalendarType':
      return (
        <CalendarFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: CalendarField.Msg) =>
              ({
                _tag: 'CalendarFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'DropdownType':
      return (
        <DropdownFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: DropdownField.Msg) =>
              ({
                _tag: 'DropdownFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'CheckboxType':
      return (
        <CheckboxFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: CheckboxField.Msg) =>
              ({
                _tag: 'CheckboxFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'RadioType':
      return (
        <RadioFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: RadioField.Msg) =>
              ({
                _tag: 'RadioFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'FileType':
      return (
        <FileFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: FileField.Msg) =>
              ({
                _tag: 'FileFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
          isDrag={model.isDrag}
        />
      )
    case 'ComboboxType':
      return (
        <ComboboxFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: ComboboxField.Msg) =>
              ({
                _tag: 'ComboboxFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    case 'SliderType':
      return (
        <SliderFieldMemo
          fieldKey={key}
          model={val.model}
          dispatch={map(
            dispatch,
            (subMsg: SliderField.Msg) =>
              ({
                _tag: 'SliderFieldMsg',
                key,
                subMsg,
              }) satisfies Msg,
          )}
        />
      )
    default:
      return <div>Internal error: form item not found</div>
  }
}

const FormItem = ({ field, dispatch, model }: Props) => {
  const result = M.lookup(S.Ord)(field)(model.forms)
  switch (result._tag) {
    case 'Some':
      return formView(field, result.value, dispatch, model)
    default:
      return <div>Internal error</div>
  }
}

export const FormItemMemo = memo(FormItem, PropEq.equals)
