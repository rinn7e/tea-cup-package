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

import { memo, type JSX } from 'react'

import { Props, PropsEq } from './type'
import { defaultComboboxView } from './view'

export const ComboboxField = <E, A>({
  fieldKey,
  model,
  dispatch,
}: Props<E, A>): JSX.Element => {
  const validationResult = model.validation(model.selectedItems)
  const view = model.ui ? model.ui : defaultComboboxView

  return view({
    key: fieldKey,
    dispatch,
    query: model.query,
    items: model.items,
    selectedItems: model.selectedItems,
    label: model.label,
    placeholder: model.placeholder,
    showValidation: model.showValidation,
    isFocus: model.isFocus,
    validationResult,
    config: model.config,
  })
}

export const ComboboxFieldMemo = memo(ComboboxField, (prev, next) => {
  return PropsEq(prev.model.config.itemEq).equals(prev, next)
}) as <E, A>(props: Props<E, A>) => JSX.Element
