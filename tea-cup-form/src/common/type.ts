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
import * as M from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'

import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import * as CalendarField from '../sub-component/calendar-field/type'
import * as CheckboxField from '../sub-component/checkbox-field/type'
import * as DropdownField from '../sub-component/dropdown-field/type'
import * as FileField from '../sub-component/file-field/type'
import * as RadioField from '../sub-component/radio-field/type'
import * as TextField from '../sub-component/text-field/type'
import * as TextPillField from '../sub-component/text-pill-field/type'
import { modifyAtIfExist } from '../util/common'

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
export const FormsEq = M.getEq(S.Eq, FormTypeEq)

// Helper functions

/**
 * Lookup `FormType` from a forms, throw error if it doesn't exist.
 */
export const lookupForm = (key: string, formEls: Forms): FormType => {
  const result = M.lookup(S.Ord)(key)(formEls)
  switch (result._tag) {
    case 'Some':
      return result.value

    default:
      throw new Error(`lookupForm: Unable to find key ${key}`)
  }
}

export const lookupFormSafe = (
  key: string,
  formEls: Forms,
): O.Option<FormType> => {
  return M.lookup(S.Ord)(key)(formEls)
}

/**
 * Update the value of `TextType`, throw error if it is not.
 */
export const updateValueTextType = (
  value: string,
  formType: FormType,
): FormType => {
  switch (formType._tag) {
    case 'TextType':
      return { _tag: 'TextType', model: { ...formType.model, currentValue: value } }

    default:
      throw new Error(`updateValueTextType: not a TextType`)
  }
}

/**
 * Update the value of `TextPillType`, throw error if it is not.
 */
export const updateTextPillValue = (
  value: string,
  formType: FormType,
): FormType => {
  switch (formType._tag) {
    case 'TextPillType':
      return { _tag: 'TextPillType', model: { ...formType.model, currentValue: value } }

    default:
      throw new Error(`updateTextPillValue: not a TextPillType`)
  }
}

/**
 * Extract the current value from a `TextType`, throw error if it is not.
 */
export const valueTextType = (formType: FormType): string => {
  switch (formType._tag) {
    case 'TextType':
      return formType.model.currentValue
    default:
      throw new Error(
        `valueTextType: Expect TextType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current pills from a `TextPillType`, throw error if it is not.
 */
export const valuePillTextType = (formType: FormType): string[] => {
  switch (formType._tag) {
    case 'TextPillType':
      return formType.model.allValues
    default:
      throw new Error(
        `valuePillTextType: Expect TextPillType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current value from a `CalendarType`, throw error if it is not.
 */
export const valueCalendarType = (formType: FormType): Date | null => {
  switch (formType._tag) {
    case 'CalendarType':
      return formType.model.currentValue
    default:
      throw new Error(
        `valueCalendarType: Expect CalendarType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current value from a `DropdownType`, throw error if it is not.
 */
export const valueDropdownType = (formType: FormType): string | null => {
  switch (formType._tag) {
    case 'DropdownType':
      return formType.model.currentValue
    default:
      throw new Error(
        `valueDropdownType: Expect DropdownType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current value from a `FileType`, throw error if it is not.
 */
export const valueFileType = (formType: FormType): File[] => {
  switch (formType._tag) {
    case 'FileType':
      return formType.model.currentValues
    default:
      throw new Error(
        `valueFileType: Expect FileType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current value from a `CheckboxType`, throw error if it is not.
 */
export const valueCheckboxType = (formType: FormType): [string, boolean][] => {
  switch (formType._tag) {
    case 'CheckboxType':
      return formType.model.currentValues
    default:
      throw new Error(
        `valueCheckboxType: Expect CheckboxType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Extract the current value from a `RadioType`, throw error if it is not.
 */
export const valueRadioType = (formType: FormType): O.Option<string> => {
  switch (formType._tag) {
    case 'RadioType':
      return formType.model.currentValue
    default:
      throw new Error(
        `valueRadioType: Expect RadioType but got ${formType._tag} instead.`,
      )
  }
}

/**
 * Modify the current value of a form type using `string`. Should be used for testing only.
 */
export const unsafeModifyFormValue =
  (key: string, newVal: string) => (formEls: Forms) => {
    return pipe(
      formEls,
      modifyAtIfExist(S.Eq)(key, (val) => {
        switch (val._tag) {
          case 'TextType':
          case 'TextPillType':
            return { _tag: val._tag, model: { ...val.model, currentValue: newVal } } as FormType
          case 'DropdownType':
            return { _tag: val._tag, model: { ...val.model, currentValue: newVal } } as FormType
          case 'CalendarType':
            return { _tag: val._tag, model: { ...val.model, currentValue: new Date(newVal) } } as FormType
          default:
            throw new Error(`unsafeModifyFormValue: formType not supported`)
        }
      }),
    )
  }

/**
 * Set `showValidation` to `true` for all form types that support it.
 */
export const showAllValidation = (forms: Forms): Forms => {
  return pipe(
    forms,
    M.map((val): FormType => {
      switch (val._tag) {
        case 'TextType':
        case 'TextPillType':
        case 'CalendarType':
        case 'DropdownType':
        case 'FileType':
          return { _tag: val._tag, model: { ...val.model, showValidation: true } } as FormType
        default:
          return val
      }
    }),
  )
}
