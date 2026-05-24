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
import * as E from 'fp-ts/lib/Either'
import { type Option } from 'fp-ts/lib/Option'
import { type JSX } from 'react'

import {
  type CalendarType,
  type CalendarTypeUiArg,
  type CheckboxChoice,
  type CheckboxType,
  type CheckboxesTypeUiArg,
  type DropdownType,
  type DropdownTypeUiArg,
  type FileType,
  type FileTypeUiArg,
  type RadioChoice,
  type RadioType,
  type RadiosTypeUiArg,
  type TextPillType,
  type TextPillTypeUiArg,
  type TextType,
  TextTypeUiArg,
} from '../type'

export const defaultTextType = (
  inputUi?: (props: TextTypeUiArg) => JSX.Element,
): TextType => ({
  _tag: 'TextType',
  placeholder: 'Username',
  label: 'Username',
  currentValue: '',
  validation: (val) => E.right(val),
  linkValidations: [],
  showValidation: false,
  isTextarea: false,
  isFocus: false,
  variant: { _tag: 'Text' },
  autocomplete: false,
  ui: inputUi ? inputUi : undefined,
})

export const defaultCheckboxType = (
  currentValues: CheckboxChoice[],
  inputUi?: (arg: CheckboxesTypeUiArg) => JSX.Element,
): CheckboxType => {
  return {
    _tag: 'CheckboxType',
    label: 'Checkbox',
    currentValues,
    validation: (inputs) => E.right(inputs),
    isMarkdown: false,
    ui: inputUi ? inputUi : undefined,
  }
}

export const defaultRadioType = (
  choices: RadioChoice[],
  currentValue: Option<string>,
  inputUi?: (arg: RadiosTypeUiArg) => JSX.Element,
): RadioType => {
  return {
    _tag: 'RadioType',
    label: 'Radio',
    choices,
    currentValue,
    isMarkdown: true,
    ui: inputUi ? inputUi : undefined,
  }
}

export const defaultDropdownType = (
  inputUi?: (arg: DropdownTypeUiArg) => JSX.Element,
): DropdownType => ({
  _tag: 'DropdownType',
  label: 'Country',
  choices: ['Cambodia', 'Russia'],
  currentValue: null,
  validation: (val) => E.right(val),
  showValidation: false,
  isFocus: false,
  placeholder: 'Select a value',
  ui: inputUi,
})

export const defaultCalendarType = (
  inputUi?: (arg: CalendarTypeUiArg) => JSX.Element,
): CalendarType => ({
  _tag: 'CalendarType',
  label: 'Birthday',
  placeholder: 'Select date',
  currentValue: null,
  validation: (val) => E.right(val),
  showValidation: false,
  isFocus: false,
  ui: inputUi ? inputUi : undefined,
})

export const defaultFileType = (
  inputUi?: (arg: FileTypeUiArg) => JSX.Element,
): FileType => ({
  _tag: 'FileType',
  label: 'Files',
  currentValues: [],
  isMultiple: false,
  showValidation: false,
  validation: (val) => E.right(val),
  ui: inputUi ? inputUi : undefined,
})

export const defaultTextPillType = (
  inputUi?: (props: TextPillTypeUiArg) => JSX.Element,
): TextPillType => ({
  _tag: 'TextPillType',
  placeholder: 'Tags',
  label: 'Tags',
  allValues: [],
  currentValue: '',
  validation: (val) => E.right(val),
  showValidation: false,
  isTextarea: false,
  isFocus: false,
  autocomplete: false,
  ui: inputUi ? inputUi : undefined,
})
