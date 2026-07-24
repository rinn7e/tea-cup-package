# `@rinn7e/tea-cup-form` Future Roadmap & Planned Form Fields

This document outlines the planned future form fields, architectural enhancements, and sub-component expansions for `@rinn7e/tea-cup-form`.

---

## Planned Future Form Fields

| Namespace | Discriminator | Primary Use Case | Key Features |
| :--- | :--- | :--- | :--- |
| `Form.Switch` | `SwitchType` | Settings & feature toggles | Binary boolean toggle, animated state, accessible ARIA attributes |
| `Form.Otp` | `OtpType` | 2FA & PIN verification | Multi-box auto-focus advance, paste support, complete code validation |
| `Form.Slider` | `SliderType` | Single-value numeric inputs | Single thumb, min/max/step config, label formatting |
| `Form.DualSlider` | `DualSliderType` | Dual range filtering & bounds | Dual thumbs (`DualRangeSlider`), valueMin/valueMax bounds, track click calculations |
| `Form.Color` | `ColorType` | Theme & UI customization | Hex/RGBA/HSL color picker, preset swatches, visual preview |
| `Form.Phone` | `PhoneType` | Contact details & SMS 2FA | Country code dropdown with flags, auto-formatting, phone validator |
| `Form.RichText` | `RichTextType` | Rich content & Markdown bios | Tiptap/Markdown editor integration, character count, format options |
| `Form.Rating` | `RatingType` | Reviews & feedback scores | Star/custom icon rating, half-star support, clearable selection |

---

## Detailed Field Proposals

### 1. `Form.Switch` (`SwitchType`)
- **Description**: A clean, accessible toggle switch for binary boolean values.
- **State Model**: `{ currentValue: boolean, label: string, disabled: boolean }`
- **Rationale**: Currently toggles are implemented using custom checkbox UI overrides. A dedicated `Form.Switch` sub-component provides a standard API for setting panels without requiring custom render functions.

### 2. `Form.Otp` (`OtpType`)
- **Description**: Multi-character digit input for OTPs, 2FA verification, and security PINs.
- **State Model**: `{ length: number, digits: string[], isMasked: boolean }`
- **Rationale**: Simplifies login and signup verification flows by handling focus movement across digit inputs, clipboard paste, and backspace navigation automatically within the Elm reducer architecture.

### 3. `Form.Slider` (`SliderType`)
- **Description**: Single-thumb slider for numeric value selection.
- **State Model**: `{ min: number, max: number, step: number, currentValue: number, formatLabel?: (val: number) => string }`
- **Rationale**: Useful for single-value continuous/stepped inputs (volume, font size, threshold).

### 4. `Form.DualSlider` (`DualSliderType`) — Detailed Architecture & Implementation Plan

#### Overview
A dual-thumb range slider field designed for selecting upper and lower numeric bounds (e.g., budget ranges, year spans, case study filters), porting the pattern from `DualRangeSlider.tsx`.

#### 1. Data Model (`src/sub-component/dual-slider-field/type.ts`)
```ts
export type Config = {
  min: number
  max: number
  step?: number
  formatLabel?: (value: number) => string
}

export type RangeValue = {
  min: number
  max: number
}

export type Model = {
  // State
  min: number
  max: number
  valueMin: number
  valueMax: number
  step: number
  lastSelected: 'left' | 'right' | null
  showValidation: boolean
  isFocus: boolean

  // Config & Validation
  label: string
  formatLabel: (value: number) => string
  validation: (val: RangeValue) => Either<string, RangeValue>
  ui?: (arg: DualSliderTypeUiArg) => JSX.Element
}

export const defaultModel = (
  config: Config,
  valueMin: number = config.min,
  valueMax: number = config.max,
  inputUi?: (arg: DualSliderTypeUiArg) => JSX.Element,
): Model => ({
  min: config.min,
  max: config.max,
  valueMin,
  valueMax,
  step: config.step ?? 1,
  lastSelected: null,
  showValidation: false,
  isFocus: false,
  label: '',
  formatLabel: config.formatLabel ?? ((v) => `${v}`),
  validation: (val) => E.right(val),
  ui: inputUi,
})
```

#### 2. Reducer Actions & Transitions (`src/sub-component/dual-slider-field/update.ts`)
```ts
export type Msg =
  | { _tag: 'SetMin'; value: number }
  | { _tag: 'SetMax'; value: number }
  | { _tag: 'SetRange'; valueMin: number; valueMax: number }
  | { _tag: 'TrackClick'; clickRatio: number }
  | { _tag: 'SetLastSelected'; handle: 'left' | 'right' }
  | { _tag: 'HandleFocus'; isFocus: boolean }
  | { _tag: 'HideValidation' }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetMin': {
      const valueMin = Math.min(msg.value, model.valueMax - model.step)
      return [{ ...model, valueMin, lastSelected: 'left' }, Cmd.none()]
    }
    case 'SetMax': {
      const valueMax = Math.max(msg.value, model.valueMin + model.step)
      return [{ ...model, valueMax, lastSelected: 'right' }, Cmd.none()]
    }
    case 'SetLastSelected': {
      return [{ ...model, lastSelected: msg.handle }, Cmd.none()]
    }
    case 'TrackClick': {
      const rawValue = model.min + msg.clickRatio * (model.max - model.min)
      const clickedValue = Math.round(rawValue / model.step) * model.step

      if (model.lastSelected === 'left') {
        const valueMin = Math.min(clickedValue, model.valueMax - model.step)
        return [{ ...model, valueMin }, Cmd.none()]
      }
      if (model.lastSelected === 'right') {
        const valueMax = Math.max(clickedValue, model.valueMin + model.step)
        return [{ ...model, valueMax }, Cmd.none()]
      }

      // Proximity fallback
      const distToMin = Math.abs(clickedValue - model.valueMin)
      const distToMax = Math.abs(clickedValue - model.valueMax)
      if (distToMin <= distToMax) {
        const valueMin = Math.min(clickedValue, model.valueMax - model.step)
        return [{ ...model, valueMin, lastSelected: 'left' }, Cmd.none()]
      } else {
        const valueMax = Math.max(clickedValue, model.valueMin + model.step)
        return [{ ...model, valueMax, lastSelected: 'right' }, Cmd.none()]
      }
    }
    case 'HandleFocus':
      return [{ ...model, isFocus: msg.isFocus }, Cmd.none()]
    case 'HideValidation':
      return [{ ...model, showValidation: false }, Cmd.none()]
  }
}
```

#### 3. React View Component (`src/sub-component/dual-slider-field/component.tsx`)
- **Top Value Labels**: Renders formatted bounds above the track using `formatLabel(valueMin)` and `formatLabel(valueMax)`.
- **Bare Track Click Handling**: Filtering out bubbled thumb clicks (`if (event.target !== event.currentTarget) return;`), calculating click ratio `(clientX - rect.left) / rect.width`, and dispatching `{ _tag: 'TrackClick', clickRatio }`.
- **Dynamic Active Range Bar**: Positioned absolutely on top of background track with `left = ((valueMin - min) / (max - min)) * 100%` and `width = ((valueMax - valueMin) / (max - min)) * 100%`.
- **Dual Range Overlay Inputs**:
  - Two stacked HTML `<input type="range">` elements with `pointer-events: none` on track container and `pointer-events: auto` on WebKit/Moz slider thumbs (`::-webkit-slider-thumb` / `::-moz-range-thumb`).
  - Active thumb z-index elevation (`z-index: 4`) and focus outline halo (`box-shadow: 0 0 0 4px rgba(42, 40, 46, 0.2)`) applied dynamically when `lastSelected === 'left'` or `'right'`.
  - Mouse down handlers (`onMouseDown={() => dispatch({ _tag: 'SetLastSelected', handle: 'left' })}`) to elevate active handle z-index immediately prior to drag interactions.

#### 4. Type Discriminator & Form Integration
- Export namespace: `Form.DualSlider`
- FormType Discriminator: `DualSliderType`
- Reducer integration in `Form.update` for `DualSliderMsg`.

### 5. `Form.Color` (`ColorType`)
- **Description**: Color picker with palette swatches and hex/RGBA output.
- **State Model**: `{ currentValue: string, presetSwatches: string[], format: 'hex' \| 'rgba' \| 'hsl' }`
- **Rationale**: Ideal for theme configuration, custom tags, profile accent colors, and custom bundle branding.

### 6. `Form.Phone` (`PhoneType`)
- **Description**: Integrated phone number input combining country code selection and local number formatting.
- **State Model**: `{ countryCode: string, phoneNumber: string }`
- **Rationale**: Eliminates the need to build separate country dropdown and phone number text fields in user onboarding and profile editing forms.

### 7. `Form.RichText` (`RichTextType`)
- **Description**: WYSIWYG / Markdown rich text field.
- **State Model**: `{ content: string, format: 'markdown' \| 'html', maxLength?: number }`
- **Rationale**: Form-bound state management for rich content editors, supporting character limits, validation, and serialization.

### 8. `Form.Rating` (`RatingType`)
- **Description**: Star or icon-based rating selector.
- **State Model**: `{ maxStars: number, currentValue: number, allowHalf: boolean }`
- **Rationale**: Ideal for feedback prompts, survey dialogs, and item scoring.

---

## Architectural Roadmap

- **Debounced Async Field Validation**: Native support for asynchronous validation pipelines (e.g., checking username availability via API) returning `TaskEither<string, A>`.
- **Form Wizard / Stepper Helper**: Stateful multi-step form wizard wrapper for step-by-step progress tracking.
- **Schema-Based Form Generator**: Optional helper to construct `Form.Forms` dynamically from JSON / Zod-like schema definitions.
