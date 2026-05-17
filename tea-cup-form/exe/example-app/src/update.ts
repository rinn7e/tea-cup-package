import * as Form from '@rinn7e/tea-cup-form'
import {
  lookupForm,
  noExtraValidation,
  runValidationForAll,
  showAllValidation,
  valueCalendarType,
  valueDropdownType,
  valueFileType,
  valuePillTextType,
  valueTextType,
} from '@rinn7e/tea-cup-form'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { Model, Msg } from './type'

const preprocessFormMsgHandler =
  (newForm: Form.Model) =>
  (model: Model): Model => {
    const isFormValid =
      runValidationForAll(newForm.forms, noExtraValidation)._tag === 'Right'
    return {
      ...model,
      form: newForm,
      isFormValid,
    }
  }

export const formMsgHandler =
  (subMsg: Form.Msg) =>
  (model: Model): Model => {
    return pipe(model.form, Form.update(subMsg), (newForm: Form.Model) =>
      preprocessFormMsgHandler(newForm)(model),
    )
  }

export const init = (): [Model, Cmd<Msg>] => {
  const forms: Form.Forms = new Map<string, Form.FormType>([
    [
      'text',
      {
        ...Form.defaultTextType(),
        label: 'Username',
        placeholder: 'Enter your username',
        validation: (val: string) =>
          val.length < 3 ? E.left('Username too short') : E.right(val),
      },
    ],
    [
      'pill',
      {
        ...Form.defaultTextPillType(),
        label: 'Tags',
        placeholder: 'Add tags (Enter to add)',
        validation: (val: string[]) =>
          val.length === 0 ? E.left('At least one tag required') : E.right(val),
      },
    ],
    [
      'checkbox',
      Form.defaultCheckboxType([
        ['Option 1', false],
        ['Option 2', true],
      ]),
    ],
    [
      'radio',
      Form.defaultRadioType(
        [
          { key: 'r1', label: 'Radio 1', desc: 'First description' },
          { key: 'r2', label: 'Radio 2', desc: 'Second description' },
        ],
        O.none,
      ),
    ],
    [
      'dropdown',
      {
        ...Form.defaultDropdownType(),
        label: 'Country',
        choices: ['Cambodia', 'Russia', 'USA'],
        validation: (val: string | null) =>
          val === null ? E.left('Please select a country') : E.right(val),
      },
    ],
    [
      'calendar',
      {
        ...Form.defaultCalendarType(),
        label: 'Birthday',
        validation: (val: Date | null) =>
          val === null ? E.left('Birthday is required') : E.right(val),
      },
    ],
    [
      'file',
      {
        ...Form.defaultFileType(),
        validation: (val: File[]) =>
          val.length === 0
            ? E.left('At least one file required')
            : E.right(val),
      },
    ],
  ])

  const initialModel: Model = {
    form: Form.init(forms),
    isFormValid: false,
    submittedValues: null,
  }

  return [preprocessFormMsgHandler(initialModel.form)(initialModel), Cmd.none()]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'FormMsg': {
      return [{ ...formMsgHandler(msg.subMsg)(model) }, Cmd.none()]
    }
    case 'ShowAllValidation': {
      return [
        {
          ...model,
          form: {
            ...model.form,
            forms: showAllValidation(model.form.forms),
          },
        },
        Cmd.none(),
      ]
    }
    case 'Submit': {
      const result = runValidationForAll(model.form.forms, noExtraValidation)
      if (result._tag === 'Left') {
        return [
          {
            ...model,
            form: {
              ...model.form,
              forms: showAllValidation(model.form.forms),
            },
          },
          Cmd.none(),
        ]
      }
      const f = model.form.forms
      const values = {
        text: valueTextType(lookupForm('text', f)),
        pill: valuePillTextType(lookupForm('pill', f)),
        dropdown: valueDropdownType(lookupForm('dropdown', f)),
        calendar: valueCalendarType(lookupForm('calendar', f))?.toISOString(),
        files: valueFileType(lookupForm('file', f)).map((f) => f.name),
      }
      return [
        { ...model, submittedValues: JSON.stringify(values, null, 2) },
        Cmd.none(),
      ]
    }
  }
}
