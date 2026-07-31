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
import { memo } from 'react'

import { Props, PropsEq } from './type/props'
import { defaultDropdownView } from './view'

export const DropdownField = ({ fieldKey, model, dispatch }: Props) => {
  const validationResult = model.validation(model.currentValue)
  const view = model.ui ? model.ui : defaultDropdownView
  return view({
    fieldKey,
    dispatch,
    label: model.label,
    validationResult,
    isFocus: model.isFocus,
    placeholder: model.placeholder,
    choices: model.choices,
    validation: model.validation,
    currentValue: model.currentValue,
    showValidation: model.showValidation,
  })
}

export const DropdownFieldMemo = memo(DropdownField, (prev, next) => {
  return PropsEq.equals(prev, next)
})
