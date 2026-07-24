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
import { Cmd } from 'tea-cup-fp'

import { type FormType, type Forms } from './common/type'
import * as CalendarField from './sub-component/calendar-field'
import * as CheckboxField from './sub-component/checkbox-field'
import * as DropdownField from './sub-component/dropdown-field'
import * as FileField from './sub-component/file-field'
import * as RadioField from './sub-component/radio-field'
import * as TextField from './sub-component/text-field'
import * as TextPillField from './sub-component/text-pill-field'
import { type Model, type Msg } from './type'

const updateFormItem = (
  key: string,
  f: (form: FormType) => [FormType, Cmd<Msg>] | null,
  forms: Forms,
): [Forms, Cmd<Msg>] => {
  const result = M.lookup(S.Ord)(key)(forms)
  if (result._tag === 'Some') {
    const res = f(result.value)
    if (res !== null) {
      const [newForm, cmd] = res
      return [pipe(forms, M.upsertAt(S.Eq)(key, newForm)), cmd]
    }
  }
  return [forms, Cmd.none()]
}

export const init = (initialForms: Forms): [Model, Cmd<Msg>] => [
  {
    forms: initialForms,
    isDrag: false,
  },
  Cmd.none(),
]

export const update =
  (msg: Msg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'TextFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'TextType') {
              const [updatedModel, subCmd] = TextField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'TextType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'TextFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'TextPillFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'TextPillType') {
              const [updatedModel, subCmd] = TextPillField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'TextPillType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'TextPillFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'CheckboxFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'CheckboxType') {
              const [updatedModel, subCmd] = CheckboxField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'CheckboxType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'CheckboxFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'RadioFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'RadioType') {
              const [updatedModel, subCmd] = RadioField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'RadioType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'RadioFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'DropdownFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'DropdownType') {
              const [updatedModel, subCmd] = DropdownField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'DropdownType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'DropdownFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'CalendarFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'CalendarType') {
              const [updatedModel, subCmd] = CalendarField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'CalendarType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'CalendarFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'FileFieldMsg': {
        const [newForms, cmd] = updateFormItem(
          msg.key,
          (form) => {
            if (form._tag === 'FileType') {
              const [updatedModel, subCmd] = FileField.update(
                msg.subMsg,
                form.model,
              )
              return [
                { _tag: 'FileType', model: updatedModel },
                subCmd.map((subMsg) => ({
                  _tag: 'FileFieldMsg',
                  key: msg.key,
                  subMsg,
                })),
              ]
            }
            return null
          },
          model.forms,
        )
        return [{ ...model, forms: newForms }, cmd]
      }
      case 'SetIsDrag': {
        return [{ forms: model.forms, isDrag: msg.status }, Cmd.none()]
      }
      case 'ResetForm': {
        return [{ forms: msg.value, isDrag: false }, Cmd.none()]
      }
      case 'AddFormItem': {
        const [key, formItem] = msg.value
        const newForms = pipe(model.forms, M.upsertAt(S.Eq)(key, formItem))
        return [{ ...model, forms: newForms }, Cmd.none()]
      }
      case 'RemoveFormItem': {
        const newForms = pipe(model.forms, M.deleteAt(S.Eq)(msg.value))
        return [{ ...model, forms: newForms }, Cmd.none()]
      }
    }
  }
