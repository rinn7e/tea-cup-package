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
import * as Map from 'fp-ts/lib/Map'
import * as S from 'fp-ts/lib/string'

import * as CalendarField from '../sub-component/calendar-field/type'
import * as CheckboxField from '../sub-component/checkbox-field/type'
import * as DropdownField from '../sub-component/dropdown-field/type'
import * as FileField from '../sub-component/file-field/type'
import * as RadioField from '../sub-component/radio-field/type'
import * as TextField from '../sub-component/text-field/type'
import * as TextPillField from '../sub-component/text-pill-field/type'

export {
  autocompleteToString,
  textInputVariantToString,
  TextInputVariantEq,
  type TextInputVariant,
  type TextTypeUiArg,
} from '../sub-component/text-field/type'

export type TextType = { _tag: 'TextType'; model: TextField.Model }
export const TextTypeEq = EqClass.struct<TextType>({
  _tag: S.Eq,
  model: TextField.ModelEq,
})

export {
  type TextPillTypeUiArg,
} from '../sub-component/text-pill-field/type'

export type TextPillType = { _tag: 'TextPillType'; model: TextPillField.Model }
export const TextPillTypeEq = EqClass.struct<TextPillType>({
  _tag: S.Eq,
  model: TextPillField.ModelEq,
})
export type TextPillMsg = TextPillField.Msg

export {
  CheckboxChoiceEq,
  type CheckboxChoice,
  type CheckboxesTypeUiArg,
} from '../sub-component/checkbox-field/type'

export type CheckboxType = { _tag: 'CheckboxType'; model: CheckboxField.Model }
export const CheckboxTypeEq = EqClass.struct<CheckboxType>({
  _tag: S.Eq,
  model: CheckboxField.ModelEq,
})

export {
  RadioChoiceEq,
  type RadioChoice,
  type RadiosTypeUiArg,
} from '../sub-component/radio-field/type'

export type RadioType = { _tag: 'RadioType'; model: RadioField.Model }
export const RadioTypeEq = EqClass.struct<RadioType>({
  _tag: S.Eq,
  model: RadioField.ModelEq,
})

export {
  type DropdownTypeUiArg,
} from '../sub-component/dropdown-field/type'

export type DropdownType = { _tag: 'DropdownType'; model: DropdownField.Model }
export const DropdownTypeEq = EqClass.struct<DropdownType>({
  _tag: S.Eq,
  model: DropdownField.ModelEq,
})

export {
  type CalendarTypeUiArg,
} from '../sub-component/calendar-field/type'

export type CalendarType = { _tag: 'CalendarType'; model: CalendarField.Model }
export const CalendarTypeEq = EqClass.struct<CalendarType>({
  _tag: S.Eq,
  model: CalendarField.ModelEq,
})

export {
  FileEq,
  type FileTypeUiArg,
} from '../sub-component/file-field/type'

export type FileType = { _tag: 'FileType'; model: FileField.Model }
export const FileTypeEq = EqClass.struct<FileType>({
  _tag: S.Eq,
  model: FileField.ModelEq,
})

export type FormType =
  | TextType
  | TextPillType
  | CheckboxType
  | RadioType
  | DropdownType
  | CalendarType
  | FileType

export const FormTypeEq: EqClass.Eq<FormType> = {
  equals: (x, y) => {
    if (x._tag === 'TextType' && y._tag === 'TextType')
      return TextTypeEq.equals(x, y)
    else if (x._tag === 'TextPillType' && y._tag === 'TextPillType')
      return TextPillTypeEq.equals(x, y)
    else if (x._tag === 'CheckboxType' && y._tag === 'CheckboxType')
      return CheckboxTypeEq.equals(x, y)
    else if (x._tag === 'RadioType' && y._tag === 'RadioType')
      return RadioTypeEq.equals(x, y)
    else if (x._tag === 'DropdownType' && y._tag === 'DropdownType')
      return DropdownTypeEq.equals(x, y)
    else if (x._tag === 'CalendarType' && y._tag === 'CalendarType')
      return CalendarTypeEq.equals(x, y)
    else if (x._tag === 'FileType' && y._tag === 'FileType')
      return FileTypeEq.equals(x, y)
    else return false
  },
}

export type Forms = Map<string, FormType>
export const FormsEq = Map.getEq(S.Eq, FormTypeEq)
