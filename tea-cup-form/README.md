# `@rinn7e/tea-cup-form`

A modular, type-safe, functional form management library built for React and the Elm-architecture powered by `tea-cup-fp` and `fp-ts`.

---

## Features

- **Sub-Component Architecture**: Form fields are organized as isolated sub-components under distinct namespaces (`Text`, `TextPill`, `Checkbox`, `Radio`, `Dropdown`, `Calendar`, `File`, `Combobox`, `Slider`).
- **Type-Safe Functional Model**: State transformations and validations are pure, immutable functions backed by `fp-ts` data structures (`Either`, `Option`, `Map`).
- **Isolated React Entrypoint**: Logic, types, and reducers are exported from `@rinn7e/tea-cup-form` without forcing React component imports. React view components are cleanly isolated under `@rinn7e/tea-cup-form/component`.
- **Highly Customizable UI**: Override default view renderers for any form field using `ui` props.
- **Built-In Validations**: Includes standard validators for text length, numbers, emails, dates, checkboxes, and file uploads.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-form
```

---

## Quick Start

### 1. Initialize Form Model

Initialize form item models inlining sub-component `defaultModel()` constructors:

```ts
import * as Form from '@rinn7e/tea-cup-form'
import * as E from 'fp-ts/lib/Either'
import { Cmd } from 'tea-cup-fp'

const forms: Form.Forms = new Map<string, Form.FormType>([
  [
    'username',
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
    'birthday',
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
    'range_setting',
    {
      _tag: 'SliderType',
      model: Form.Slider.defaultModel(
        {
          min: 0,
          max: 100,
          step: 1,
          label: 'Time Period',
          unit: 'days',
        },
        30,
      ),
    },
  ],
])

const [formModel, formCmd] = Form.init(forms)
```

### 2. Handle Reducer Messages

Prefer handling form messages using the `formMsgHandler` pattern with `mapFst` from `fp-ts/lib/Tuple`:

```ts
import * as Form from '@rinn7e/tea-cup-form'
import { mapFst, mapSnd } from 'fp-ts/lib/Tuple'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

const preprocessFormMsgHandler =
  (newForm: Form.Model) =>
  (model: AppModel): AppModel => {
    const isFormValid =
      Form.runValidationForAll(newForm.forms, Form.noExtraValidation)._tag ===
      'Right'
    return {
      ...model,
      form: newForm,
      isFormValid,
    }
  }

export const formMsgHandler =
  (subMsg: Form.Msg) =>
  (model: AppModel): [AppModel, Cmd<AppMsg>] => {
    return pipe(
      model.form,
      Form.update(subMsg),
      mapFst((newForm) => preprocessFormMsgHandler(newForm)(model)),
      mapSnd((cmd) =>
        cmd.map((subMsg) => ({ _tag: 'FormMsg' as const, subMsg })),
      ),
    )
  }

export const update = (
  msg: AppMsg,
  model: AppModel,
): [AppModel, Cmd<AppMsg>] => {
  switch (msg._tag) {
    case 'FormMsg': {
      return formMsgHandler(msg.subMsg)(model)
    }
  }
}
```

### 3. Render Form Items

Import `<FormItemMemo />` from `@rinn7e/tea-cup-form/component`:

```tsx
import { FormItemMemo } from '@rinn7e/tea-cup-form/component'

export const MyFormView = ({ model, dispatch }: Props) => (
  <form onSubmit={handleSubmit}>
    <FormItemMemo field='username' model={model.form} dispatch={dispatch} />
    <FormItemMemo field='birthday' model={model.form} dispatch={dispatch} />
    <FormItemMemo
      field='range_setting'
      model={model.form}
      dispatch={dispatch}
    />
    <button type='submit'>Submit</button>
  </form>
)
```

---

## Available Sub-Components

| Namespace       | FormType Discriminator | Model Constructor                           | Description                                          |
| :-------------- | :--------------------- | :------------------------------------------ | :--------------------------------------------------- |
| `Form.Text`     | `TextType`             | `Text.defaultModel()`                       | Text input & textarea fields                         |
| `Form.TextPill` | `TextPillType`         | `TextPill.defaultModel()`                   | Tag / pill input field                               |
| `Form.Checkbox` | `CheckboxType`         | `Checkbox.defaultModel(choices)`            | Checkbox list field                                  |
| `Form.Radio`    | `RadioType`            | `Radio.defaultModel(choices, value)`        | Radio selection list field                           |
| `Form.Dropdown` | `DropdownType`         | `Dropdown.defaultModel()`                   | Custom dropdown field                                |
| `Form.Calendar` | `CalendarType`         | `Calendar.defaultModel()`                   | Date picker calendar field                           |
| `Form.File`     | `FileType`             | `File.defaultModel()`                       | Drag & drop file upload field                        |
| `Form.Combobox` | `ComboboxType`         | `Combobox.defaultModel(config)`             | Searchable combobox selection field                  |
| `Form.Slider`   | `SliderType`           | `Slider.defaultModel(config, initialValue)` | Numeric range slider input with custom thumb support |

---

## Development & Testing

```bash
# Typecheck package
pnpm run check

# Build production bundle (ESM, CJS, DTS)
pnpm run build

# Run Playwright E2E test suite (14 tests)
pnpm --filter tea-cup-form-example-e2e test:e2e
```

---

## Future Roadmap

For planned future form fields (`Switch`, `Otp`, `DualSlider`, `Color`, `Phone`, `RichText`, `Rating`) and architectural enhancements, see the [Future Roadmap & Planned Fields](docs/ROADMAP.md).

---

## License

[MIT License](LICENSE) © 2025 Moremi Vannak
