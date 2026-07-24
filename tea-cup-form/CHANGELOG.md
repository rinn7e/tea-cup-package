# Changelog

All notable changes to `@rinn7e/tea-cup-form` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.2] - 2026-07-24

### Added
- **Sub-Component Architecture**: Modularized form field implementations into sub-components (`Text`, `TextPill`, `Checkbox`, `Radio`, `Dropdown`, `Calendar`, `File`).
- Sub-component directory structure:
  - `type.ts`: `Msg`, `Model`, `ModelEq`, `Props`, `PropsEq`, `defaultModel()`, and `XxxTypeUiArg` with JSDoc comments.
  - `update.ts`: Pure `update(msg, field)` reducer.
  - `view.tsx`: `defaultXxxView(...)` view renderer.
  - `component.tsx`: React component `XxxField` and `XxxFieldMemo`.
  - `index.ts`: Exports `./type`, `./update`, and `./view`.
- **Sub-Component Namespaces**: Re-exported sub-components as namespaces in `@rinn7e/tea-cup-form` (`Text`, `TextPill`, `Checkbox`, `Radio`, `Dropdown`, `Calendar`, `File`).
- **Secondary Entrypoint**: React components accessible via `@rinn7e/tea-cup-form/component` (`FormItemMemo`).
- **Playwright E2E Tests**: Comprehensive 12-test E2E suite covering all sub-components in `exe/example-app-e2e`.

### Changed
- Moved constructors to `type.ts` and renamed to `defaultModel()`, returning the sub-component's internal `Model` state directly instead of the outer `FormType` union wrapper.
- Deleted standalone `util.ts` files across all sub-components.
- Consolidated form helper functions (`lookupForm`, `valueTextType`, `valueCalendarType`, etc.) into `src/common/type.ts`.
- Moved `src/validation.ts` to `src/util/validation.ts`.
- Removed standalone `view.tsx` and moved `formView` into `src/component.tsx`.

### Fixed
- Fixed `ModelEq` in `DropdownField` and `CalendarField` where `showValidation` was set to `{ equals: () => true }` instead of `B.Eq`, enabling React `memo` re-renders on submit error triggers.
- Restored uploaded file list preview cards, remove buttons, and error tooltips in `defaultFileView`.

### Migration Guide (v0.1.0-alpha.1 -> v0.1.0-alpha.2)

#### 1. Constructor Function Renaming (`defaultModel`) & Model Spreading
Form constructors have been moved to `type.ts` and renamed to `defaultModel()`. They return the sub-component's internal `Model` directly, allowing clean property overrides.

```ts
// Old (0.1.0-alpha.1)
import { defaultTextType } from '@rinn7e/tea-cup-form'

const textItem = defaultTextType()

// New (0.1.0-alpha.2)
import { Text } from '@rinn7e/tea-cup-form'

const textItem: Form.FormType = {
  _tag: 'TextType',
  model: {
    ...Text.defaultModel(),
    label: 'Username',
    placeholder: 'Enter your username',
  },
}
```

#### 2. React Components Entrypoint
React `.tsx` components are imported separately from `@rinn7e/tea-cup-form/component`.

```tsx
// Old (0.1.0-alpha.1)
import { formView } from '@rinn7e/tea-cup-form'

// New (0.1.0-alpha.2)
import { FormItemMemo } from '@rinn7e/tea-cup-form/component'

<FormItemMemo
  field={key}
  model={model.form}
  dispatch={dispatch}
/>
```

#### 3. Consolidated Helper Exports & Validation Utilities
Helper functions (`lookupForm`, `valueTextType`, `valueCalendarType`, `showAllValidation`, `runValidationForAll`, etc.) are exported directly from `@rinn7e/tea-cup-form`.

```ts
import { lookupForm, valueTextType, runValidationForAll, showAllValidation } from '@rinn7e/tea-cup-form'
```

## [0.1.0-alpha.1] - 2026-07-24

### Added
- Initial alpha release of `@rinn7e/tea-cup-form`.
