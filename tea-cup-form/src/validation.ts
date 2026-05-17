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
import type { Either } from 'fp-ts/lib/Either'
import * as E from 'fp-ts/lib/Either'
import * as M from 'fp-ts/lib/Map'
import type { Option } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import type { FormType, Forms, TextType } from './type'
import { and, or } from './util/common'
import { lookupForm, valueTextType } from './util/util'

// Validator

export const nonEmptyValidator = (
  input: string,
  fieldName: string,
): Either<string, string> => {
  if (input.trim() === '') return E.left(`${fieldName} is required`)
  else return E.right(input)
}

// Useful when requiring non-string field (ie. Calendar)
export const notNullValidator = <A>(
  input: A | null,
): Either<string, A | null> => {
  if (!input) return E.left('Required')
  else return E.right(input)
}

// Similar to `notNullValidator` but work with `Option` instead
export const notNoneValidator = <A>(
  input: Option<A>,
): Either<string, Option<A>> => {
  if (input._tag === 'None') return E.left('Required')
  else return E.right(input)
}

export const emailValidator = (input: string): Either<string, string> => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

  if (emailRegex.test(input)) {
    return E.right(input)
  } else {
    return E.left('The email is not a valid email')
  }
}

export const numberValidator = (input: string): Either<string, string> => {
  const num = Number(input)
  return isNaN(num) ? E.left('Input should be a number') : E.right(input)
}

export const minLengthValidator =
  (label: string, minLength: number) =>
  (input: string): Either<string, string> => {
    if (input.length < minLength)
      return E.left(`${label} should be at least ${minLength} characters long`)
    else return E.right(input)
  }

export const maxLengthValidator =
  (label: string, maxLength: number) =>
  (input: string): Either<string, string> => {
    if (input.length > maxLength)
      return E.left(`${label} should be at most ${maxLength} characters long`)
    else return E.right(input)
  }

// Checkbox validation
export const allSelectRequired = (
  inputs: [string, boolean][],
): Either<string, [string, boolean][]> => {
  const isAllChecked = pipe(
    inputs,
    A.map(([_, bool]) => bool),
    and,
  )
  if (isAllChecked) return E.right(inputs)
  else return E.left('You must checked this.')
}

export const atLeastOneSelected = (
  inputs: [string, boolean][],
): Either<string, [string, boolean][]> => {
  const isOneSelected = pipe(
    inputs,
    A.map(([_, bool]) => bool),
    or,
  )
  if (isOneSelected) return E.right(inputs)
  else return E.left('You must at least check one value')
}

// File uploads: limit the number of files
export const exactLengthFileValidator =
  (exactLength: number) =>
  (inputs: File[]): Either<string, File[]> => {
    if (inputs.length === exactLength) return E.right(inputs)
    else {
      const plural = exactLength > 1 ? 's' : ''
      return E.left(`Please upload exactly ${exactLength} file${plural}.`)
    }
  }

export const phoneValidator = (input: string): Either<string, string> => {
  const phoneRegex = /^[\d\s+()]+$/

  if (phoneRegex.test(input)) {
    return E.right(input)
  } else {
    return E.left('Only 0-9, (, ), + and spaces are allowed')
  }
}

export const idValidator = (input: string): Either<string, string> => {
  const idRegex = /^[A-Za-z0-9 .-]+$/

  if (idRegex.test(input)) {
    return E.right(input)
  } else {
    return E.left('Only a-z, A-Z, 0-9, -, . and spaces are allowed')
  }
}

export const fromMB = (mb: number) => mb * 1000 * 1000

// File uploads: limit the size of files
export const maxSizeFileValidator =
  (maxSizeInByte: number) =>
  (inputs: File[]): Either<string, File[]> => {
    return pipe(
      inputs,
      A.map((file) => file.size > maxSizeInByte),
      or,
      (isBigFileExist) => {
        if (isBigFileExist)
          return E.left(
            `Each files is limited to ${maxSizeInByte / (1000 * 1000)} MB.`,
          )
        else return E.right(inputs)
      },
    )
  }

const hasDuplicates = <A>(array: A[]) => {
  return new Set(array).size !== array.length
}

// File uploads: ensure file type is image
export const imageFileValidator = (inputs: File[]): Either<string, File[]> => {
  return pipe(
    inputs,
    A.map((file) => file.type.split('/')[0] !== 'image'),
    or,
    (isNotImageFileExist) => {
      if (isNotImageFileExist)
        return E.left(`All the files should be image files.`)
      else return E.right(inputs)
    },
  )
}

// File uploads: all the file must be uniques
export const uniqueFileValidator = (inputs: File[]): Either<string, File[]> => {
  return pipe(
    inputs,
    A.map((file) => file.name),
    (files) => {
      if (hasDuplicates(files)) return E.left(`Cannot upload the same files.`)
      else return E.right(inputs)
    },
  )
}

// Helper functions when running full validation
export const noExtraValidation = (forms: Forms) => E.right(forms)

// One of the form value has to be changed to consider the form valid (useful for editing form.)
export const notTheSameExtraValidation =
  (initialForms: Forms) => (forms: Forms) => {
    // Extra the values of form items, and convert them to string.
    const extractValue = (form: Forms) =>
      pipe(
        form,
        M.mapWithIndex((_, val) => {
          switch (val._tag) {
            case 'TextType':
              return val.currentValue
            case 'TextPillType':
              return JSON.stringify(val.allValues)
            case 'CalendarType':
              return JSON.stringify(val.currentValue)
            case 'DropdownType':
              return JSON.stringify(val.currentValue)
            case 'CheckboxType':
              return JSON.stringify(val.currentValues)
            case 'RadioType':
              return JSON.stringify(val.currentValue)
            case 'FileType':
              throw new Error(
                'FileType not support `notTheSameExtraValidation`.',
              )
          }
        }),
      )

    const isTheSame = M.getEq(S.Eq, S.Eq).equals(
      extractValue(initialForms),
      extractValue(forms),
    )
    if (isTheSame) return E.left('The form values have not been changed.')
    else return E.right(forms)
  }

// Run validation on the full forms
export const runValidationForAll = (
  forms: Forms,
  extraValidation: (forms: Forms) => Either<string, Forms>,
): Either<string, Forms> => {
  const isAllFieldValid = pipe(
    forms,
    M.mapWithIndex((_, val) => {
      switch (val._tag) {
        case 'TextType': {
          return runValidationAndLink(val, forms)._tag === 'Right'
        }
        case 'TextPillType': {
          return val.validation(val.allValues)._tag === 'Right'
        }
        case 'CalendarType': {
          return val.validation(val.currentValue)._tag === 'Right'
        }
        case 'DropdownType': {
          return val.validation(val.currentValue)._tag === 'Right'
        }
        case 'CheckboxType': {
          return val.validation(val.currentValues)._tag === 'Right'
        }
        case 'RadioType': {
          // TODO: Add vadation to radio form type
          // return val.validation(val.currentValue)._tag === 'Right'
          return true
        }
        case 'FileType': {
          return val.validation(val.currentValues)._tag === 'Right'
        }
        default:
          return true
      }
    }),
    M.toArray(S.Ord),
    A.map(([_, val]) => val),
    and,
  )

  return isAllFieldValid
    ? extraValidation(forms)
    : E.left('Some fields are invalid.')
}

export const runValidationAndLink = (formType: TextType, forms: Forms) => {
  const validationResult = formType.validation(formType.currentValue)
  if (validationResult._tag === 'Right') {
    const validationResultArray = pipe(
      formType.linkValidations,
      A.map((linkValidation) => {
        const linkValue = pipe(
          lookupForm(linkValidation.linkKey, forms),
          valueTextType,
        )
        const linkValidationResult = linkValidation.validation(
          validationResult.right,
          linkValue,
        )
        return linkValidationResult
      }),
    )

    return pipe(
      validationResultArray,
      A.reduce(validationResult as Either<string, string>, (b, a) => {
        if (a._tag === 'Left') return a
        else return b
      }),
    )
  } else return validationResult
}

export const runValidation = (formType: FormType) => {
  switch (formType._tag) {
    case 'TextType':
      return formType.validation(formType.currentValue)
    case 'TextPillType':
      return formType.validation(formType.allValues)
    case 'CalendarType':
      return formType.validation(formType.currentValue)
    case 'DropdownType':
      return formType.validation(formType.currentValue)
    case 'CheckboxType':
      return formType.validation(formType.currentValues)
    case 'RadioType':
      // TODO: Add vadation to radio form type
      // return val.validation(val.currentValue)._tag === 'Right'
      return E.right(formType.currentValue)
    case 'FileType':
      return formType.validation(formType.currentValues)
  }
}
