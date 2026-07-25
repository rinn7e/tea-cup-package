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
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as S from 'fp-ts/lib/string'
import { Dispatcher } from 'tea-cup-fp'

import { FormType, Forms, FormsEq } from './common/type'
import type * as CalendarField from './sub-component/calendar-field/type'
import type * as CheckboxField from './sub-component/checkbox-field/type'
import type * as ComboboxField from './sub-component/combobox-field/type'
import type * as DropdownField from './sub-component/dropdown-field/type'
import type * as FileField from './sub-component/file-field/type'
import type * as RadioField from './sub-component/radio-field/type'
import type * as SliderField from './sub-component/slider-field/type'
import type * as TextField from './sub-component/text-field/type'
import type * as TextPillField from './sub-component/text-pill-field/type'

export type Model = {
  forms: Forms
  isDrag: boolean
  // ^ global variable to check if mouse is dragging something
}

export const ModelEq = EqClass.struct<Model>({
  forms: FormsEq,
  isDrag: B.Eq,
})

export type Props = {
  field: string
  dispatch: Dispatcher<Msg>
  model: Model
}

export const PropEq = EqClass.struct<Props>({
  field: S.Eq,
  dispatch: { equals: () => true },
  model: ModelEq,
})

// Reducer Msg

export type Msg =
  | {
      _tag: 'TextFieldMsg'
      key: string
      subMsg: TextField.Msg
    }
  | {
      _tag: 'TextPillFieldMsg'
      key: string
      subMsg: TextPillField.Msg
    }
  | {
      _tag: 'CheckboxFieldMsg'
      key: string
      subMsg: CheckboxField.Msg
    }
  | {
      _tag: 'RadioFieldMsg'
      key: string
      subMsg: RadioField.Msg
    }
  | {
      _tag: 'DropdownFieldMsg'
      key: string
      subMsg: DropdownField.Msg
    }
  | {
      _tag: 'CalendarFieldMsg'
      key: string
      subMsg: CalendarField.Msg
    }
  | {
      _tag: 'FileFieldMsg'
      key: string
      subMsg: FileField.Msg
    }
  | {
      _tag: 'ComboboxFieldMsg'
      key: string
      subMsg: ComboboxField.Msg
    }
  | {
      _tag: 'SliderFieldMsg'
      key: string
      subMsg: SliderField.Msg
    }
  | {
      _tag: 'SetIsDrag'
      status: boolean
    }
  | {
      _tag: 'ResetForm'
      value: Forms
    }
  | {
      _tag: 'AddFormItem'
      value: [string, FormType]
    }
  | {
      _tag: 'RemoveFormItem'
      value: string // key
    }
