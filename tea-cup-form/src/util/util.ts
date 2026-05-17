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
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import { type FormType, type Forms } from '../type'
import { modifyAtIfExist } from './common'

// export const defaultForms = new Map<string, FormType>([
//   ['username', defaultTextType()],
//   ['password', defaultTextType()],
// ])

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
 * Update the value of `TextType`,  throw error if it is not.
 */
export const updateValueTextType = (
  value: string,
  formType: FormType,
): FormType => {
  switch (formType._tag) {
    case 'TextType':
      return { ...formType, currentValue: value }

    default:
      throw new Error(`updateValueTextType: not a TextType`)
  }
}

/**
 * Update the value of `TextPillType`,  throw error if it is not.
 */
export const updateTextPillValue = (
  value: string,
  formType: FormType,
): FormType => {
  switch (formType._tag) {
    case 'TextPillType':
      return { ...formType, currentValue: value }

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
      return formType.currentValue
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
      return formType.allValues
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
      return formType.currentValue
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
      return formType.currentValue
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
      return formType.currentValues
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
      return formType.currentValues
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
      return formType.currentValue
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
            return { ...val, currentValue: newVal }
          case 'DropdownType':
            return { ...val, currentValue: newVal }
          case 'CalendarType':
            return { ...val, currentValue: new Date(newVal) }
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
    M.map((val) => {
      switch (val._tag) {
        case 'TextType':
        case 'TextPillType':
        case 'CalendarType':
        case 'DropdownType':
        case 'FileType':
          return { ...val, showValidation: true }
        default:
          return val
      }
    }),
  )
}
