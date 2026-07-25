# Code Conventions for `@rinn7e/tea-cup-package`

## Mistakes to Avoid

1. **Assuming Generic Defaults Instead of Auditing Codebase Conventions**:
   - **Why**: Do not rely on generic framework/language habits instead of inspecting existing component patterns in the codebase *before* writing code. Always enforce established project styling and initialization standards.
   - **Example**: In `@rinn7e/tea-cup-form`, use Tailwind CSS (`className="..."`) for all view styling rather than inline `style={{ ... }}` layout attributes. Do not add default parameter fallbacks (`= 0`) or redundant `init()` helpers to sub-components:
     ```tsx
     // Good: Tailwind CSS
     <div className="flex w-full flex-col gap-1.5" />

     // Bad: Inline style
     <div style={{ display: 'flex', flexDirection: 'column' }} />
     ```

2. **Over-Engineering Simple Logic Instead of Respecting Clean Design**:
   - **Why**: Do not attempt to "improve" or rewrite code that is already clean, tested, and working. Preserve original calculation logic, minimal interfaces, and JSDoc comments.
   - **Example**: In `slider-field/util.ts`, keep original percentage calculation math and JSDoc comments intact instead of introducing over-complicated floating-point precision helpers or unnecessary `customThumbView` slots.

3. **Writing Code Without First Grasping the Overall Architecture**:
   - **Why**: Do not implement features or sub-modules without first understanding how state, configuration, view rendering, and event propagation fit together across the project.
   - **Example**: In `@rinn7e/tea-cup-form`, follow the `ComboboxField` model pattern where `Config` is a standalone type embedded inside `Model` (`model.config`) with `ConfigEq = EqAlways`. Export components named `<Name>Field` and `<Name>FieldMemo`:
     ```typescript
     export type Model = {
       value: number
       isDragging: boolean
       config: Config
     }
     ```

4. **Writing Documentation or Guides Without Scanning the Target Codebase First**:
   - **Why**: Do not write documentation, specifications, or porting guides conceptually based on assumptions. Always search and inspect the target repository codebase first using code search tools to reference real file locations, exact types, and verified architectural structures.
   - **Example**: Before writing a porting guide for `chatfusion-dev`, search the repository to locate the exact target files (`category-setting-dialog` and `tea-cup-range-input`).

5. **Attempting to Use a Library Sub-Component Directly Without Checking How the Library is Properly Integrated in the Codebase**:
   - **Why**: Always check how a library or framework is designed to be integrated at the top level before consuming its individual parts. Do not attach sub-component states directly to feature component models when the library provides a unified parent engine.
   - **Example**: In `@rinn7e/tea-cup-form`, sub-components should not have their internal models (`SliderField.Model`) placed directly on feature dialog state. Instead, they must be consumed through the top-level `Form.Model` engine containing fields inside `forms: Map<string, Form.FormType>`:
     ```typescript
     // Good: Unified Form.Model
     export type Model = {
       form: Form.Model
       buttonStatus: RD.RemoteData<string, true>
     }

     // Bad: Direct sub-component model
     export type Model = {
       rangeInput: SliderField.Model
       buttonStatus: RD.RemoteData<string, true>
     }
     ```

6. **Using Implicit Early Returns Instead of Explicit Decision Trees**:
   - **Why**: Always prefer explicit `if (...) { ... } else { ... }` decision tree branching over implicit early returns. Explicit decision trees make control flow clear, intentional, and structured.
   - **Example**: In `slider-field/update.ts`, use explicit `if-else` branching instead of returning implicitly after an `if`:
     ```typescript
     // Good: Explicit decision tree
     if (model.isDragging === msg.value) {
       return [model, Cmd.none()]
     } else {
       return [{ ...model, isDragging: msg.value }, Cmd.none()]
     }

     // Bad: Implicit early return
     if (model.isDragging === msg.value) {
       return [model, Cmd.none()]
     }
     return [{ ...model, isDragging: msg.value }, Cmd.none()]
     ```
