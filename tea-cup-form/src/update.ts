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
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import * as CalendarField from './sub-component/calendar-field'
import * as CheckboxField from './sub-component/checkbox-field'
import * as DropdownField from './sub-component/dropdown-field'
import * as FileField from './sub-component/file-field'
import * as RadioField from './sub-component/radio-field'
import * as TextField from './sub-component/text-field'
import * as TextPillField from './sub-component/text-pill-field'
import { type FormType, type Forms, type Model, type Msg } from './type'
import { modifyAtIfExist } from './util/common'

export const init = (initialForms: Forms): Model => ({
  forms: initialForms,
  isDrag: false,
})

export const update =
  (msg: Msg) =>
  (model: Model): Model => {
    switch (msg._tag) {
      case 'TextFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'TextType') {
              return {
                _tag: 'TextType',
                model: TextField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'TextPillFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'TextPillType') {
              return {
                _tag: 'TextPillType',
                model: TextPillField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'CheckboxFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'CheckboxType') {
              return {
                _tag: 'CheckboxType',
                model: CheckboxField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'RadioFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'RadioType') {
              return {
                _tag: 'RadioType',
                model: RadioField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'DropdownFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'DropdownType') {
              return {
                _tag: 'DropdownType',
                model: DropdownField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'CalendarFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'CalendarType') {
              return {
                _tag: 'CalendarType',
                model: CalendarField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'FileFieldMsg': {
        const newForms = pipe(
          model.forms,
          modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
            if (form._tag === 'FileType') {
              return {
                _tag: 'FileType',
                model: FileField.update(msg.subMsg, form.model),
              }
            }
            return form
          }),
        )
        return { ...model, forms: newForms }
      }
      case 'SetIsDrag': {
        return { forms: model.forms, isDrag: msg.status }
      }
      case 'ResetForm': {
        return { forms: msg.value, isDrag: false }
      }
      case 'AddFormItem': {
        const [key, formItem] = msg.value
        const newForms = pipe(model.forms, M.upsertAt(S.Eq)(key, formItem))
        return { ...model, forms: newForms }
      }
      case 'RemoveFormItem': {
        const newForms = pipe(model.forms, M.deleteAt(S.Eq)(msg.value))
        return { ...model, forms: newForms }
      }
    }
  }
