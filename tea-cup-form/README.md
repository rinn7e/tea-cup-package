# `@rinn7e/tea-cup-form`

A modular, type-safe, functional form management library built for React and the Elm-architecture powered by `tea-cup-fp` and `fp-ts`.

---

## ✨ Features

- **⚡ Sub-Component Architecture**: Form fields are organized as isolated sub-components under distinct namespaces (`Text`, `TextPill`, `Checkbox`, `Radio`, `Dropdown`, `Calendar`, `File`).
- **🛡️ Type-Safe Functional Model**: State transformations and validations are pure, immutable functions backed by `fp-ts` data structures (`Either`, `Option`, `Map`).
- **📦 Isolated React Entrypoint**: Logic, types, and reducers are exported from `@rinn7e/tea-cup-form` without forcing React component imports. React view components are cleanly isolated under `@rinn7e/tea-cup-form/component`.
- **🎨 Highly Customizable UI**: Override default view renderers for any form field using `inputUi` props.
- **✅ Built-In Validations**: Includes standard validators for text length, numbers, emails, dates, checkboxes, and file uploads.

---

## 🚀 Installation

```bash
pnpm add @rinn7e/tea-cup-form
```

---

## 📖 Quick Start

### 1. Initialize Form Model

Initialize form item models inlining sub-component `defaultModel()` constructors:

```ts
import * as Form from '@rinn7e/tea-cup-form'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'

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
])

const initialModel = Form.init(forms)
```

### 2. Handle Reducer Messages

In your update function:

```ts
import * as Form from '@rinn7e/tea-cup-form'

export const update = (msg: Form.Msg, model: Form.Model): Form.Model => {
  return Form.update(msg)(model)
}
```

### 3. Render Form Items

Import `<FormItemMemo />` from `@rinn7e/tea-cup-form/component`:

```tsx
import { FormItemMemo } from '@rinn7e/tea-cup-form/component'

export const MyFormView = ({ model, dispatch }: Props) => (
  <form onSubmit={handleSubmit}>
    <FormItemMemo
      field="username"
      model={model.form}
      dispatch={dispatch}
    />
    <FormItemMemo
      field="birthday"
      model={model.form}
      dispatch={dispatch}
    />
    <button type="submit">Submit</button>
  </form>
)
```

---

## 🧩 Available Sub-Components

| Namespace | FormType Discriminator | Model Constructor | Description |
| :--- | :--- | :--- | :--- |
| `Form.Text` | `TextType` | `Text.defaultModel()` | Text input & textarea fields |
| `Form.TextPill` | `TextPillType` | `TextPill.defaultModel()` | Tag / pill input field |
| `Form.Checkbox` | `CheckboxType` | `Checkbox.defaultModel(choices)` | Checkbox list field |
| `Form.Radio` | `RadioType` | `Radio.defaultModel(choices, value)` | Radio selection list field |
| `Form.Dropdown` | `DropdownType` | `Dropdown.defaultModel()` | Custom dropdown field |
| `Form.Calendar` | `CalendarType` | `Calendar.defaultModel()` | Date picker calendar field |
| `Form.File` | `FileType` | `File.defaultModel()` | Drag & drop file upload field |

---

## 🛠️ Development & Testing

```bash
# Typecheck package
pnpm run check

# Build production bundle (ESM, CJS, DTS)
pnpm run build

# Run Playwright E2E test suite (12 tests)
pnpm --filter tea-cup-form-example-e2e test:e2e
```

---

## 📄 License

[MIT License](LICENSE) © 2025 Moremi Vannak
