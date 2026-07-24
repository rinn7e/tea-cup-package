import * as Form from '@rinn7e/tea-cup-form'
import {
  lookupForm,
  noExtraValidation,
  runValidationForAll,
  showAllValidation,
  valueCalendarType,
  valueCheckboxType,
  valueComboboxType,
  valueDropdownType,
  valueFileType,
  valuePillTextType,
  valueRadioType,
  valueTextType,
} from '@rinn7e/tea-cup-form'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import * as S from 'fp-ts/lib/string'
import { mapFst } from 'fp-ts/lib/Tuple'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  convertMockUserSearchHandler,
  decodeUser,
  mockUserSearchHandler,
} from './mock/user'
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
  (model: Model): [Model, Cmd<Msg>] => {
    const [newModel, cmd] = pipe(
      model.form,
      Form.update(subMsg),
      mapFst((newForm) => preprocessFormMsgHandler(newForm)(model)),
    )
    return [
      newModel,
      cmd.map((subMsg) => ({ _tag: 'FormMsg' as const, subMsg })),
    ]
  }

export const init = (): [Model, Cmd<Msg>] => {
  const userComboboxConfig = {
    handler: convertMockUserSearchHandler(mockUserSearchHandler),
    labelText: 'Assigned Users',
    notFoundText: 'No matching users found',
    itemEq: Form.DataJsonEq,
    getKey: (item: Form.DataJson) => decodeUser(item).id,
    chipView: (item: Form.DataJson) => decodeUser(item).name,
    resultView: (item: Form.DataJson) => {
      const user = decodeUser(item)
      return `${user.name} (${user.email})`
    },
  }

  const forms: Form.Forms = new Map<string, Form.FormType>([
    [
      'text',
      {
        _tag: 'TextType',
        model: {
          ...Form.Text.defaultModel(),
          label: 'Username',
          placeholder: 'Enter your username',
          validation: (val: string) =>
            val.length < 3 ? E.left('Username too short') : E.right(val),
        },
      },
    ],
    [
      'pill',
      {
        _tag: 'TextPillType',
        model: {
          ...Form.TextPill.defaultModel(),
          label: 'Tags',
          placeholder: 'Add tags (Enter to add)',
          validation: (val: string[]) =>
            val.length === 0
              ? E.left('At least one tag required')
              : E.right(val),
        },
      },
    ],
    [
      'checkbox',
      {
        _tag: 'CheckboxType',
        model: Form.Checkbox.defaultModel([
          ['Option 1', false],
          ['Option 2', true],
        ]),
      },
    ],
    [
      'radio',
      {
        _tag: 'RadioType',
        model: Form.Radio.defaultModel(
          [
            { key: 'r1', label: 'Radio 1', desc: 'First description' },
            { key: 'r2', label: 'Radio 2', desc: 'Second description' },
          ],
          O.none,
        ),
      },
    ],
    [
      'dropdown',
      {
        _tag: 'DropdownType',
        model: {
          ...Form.Dropdown.defaultModel(),
          label: 'Country',
          choices: ['Cambodia', 'Russia', 'USA'],
          validation: (val: string | null) =>
            val === null ? E.left('Please select a country') : E.right(val),
        },
      },
    ],
    [
      'calendar',
      {
        _tag: 'CalendarType',
        model: {
          ...Form.Calendar.defaultModel(),
          label: 'Birthday',
          validation: (val: Date | null) =>
            val === null ? E.left('Birthday is required') : E.right(val),
        },
      },
    ],
    [
      'combobox',
      {
        _tag: 'ComboboxType',
        model: Form.Combobox.defaultModel(userComboboxConfig),
      },
    ],
    [
      'file',
      {
        _tag: 'FileType',
        model: {
          ...Form.File.defaultModel(),
          validation: (val: File[]) =>
            val.length === 0
              ? E.left('At least one file required')
              : E.right(val),
        },
      },
    ],
  ])

  const [initialForm, initialFormCmd] = Form.init(forms)
  const initialModel: Model = {
    form: initialForm,
    isFormValid: false,
    submittedValues: null,
  }

  return [
    preprocessFormMsgHandler(initialModel.form)(initialModel),
    initialFormCmd.map((subMsg) => ({ _tag: 'FormMsg' as const, subMsg })),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'FormMsg': {
      return formMsgHandler(msg.subMsg)(model)
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
        checkbox: valueCheckboxType(lookupForm('checkbox', f)),
        radio: pipe(valueRadioType(lookupForm('radio', f)), O.toUndefined),
        dropdown: valueDropdownType(lookupForm('dropdown', f)),
        calendar: valueCalendarType(lookupForm('calendar', f))?.toISOString(),
        combobox: valueComboboxType(lookupForm('combobox', f)).map(
          (user) => decodeUser(user).name,
        ),
        files: valueFileType(lookupForm('file', f)).map((f) => f.name),
      }
      return [
        { ...model, submittedValues: JSON.stringify(values, null, 2) },
        Cmd.none(),
      ]
    }
  }
}
