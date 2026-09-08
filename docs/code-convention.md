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
   - **Example**: Before writing a porting guide for a target application, search the repository to locate the exact target files (`category-setting-dialog` and `tea-cup-range-input`).

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

7. **Exporting `component.tsx` in `index.ts` of Library Packages**:
   - **Why**: Do not re-export React components (`component.tsx`) from the package root entry `index.ts`. Package root entry points should strictly export pure types, model definitions, and update logic (`type.ts` and `update.ts`). Callers must import view/component code explicitly from `component.tsx` (or package subpath entry).
   - **Example**: In `@rinn7e/tea-cup-pagination` and `@rinn7e/tea-cup-navigation`, keep `src/index.ts` strictly limited to `type` and `update`:
     ```typescript
     // Good: Only export type and update from index.ts
     export * from './type'
     export * from './update'

     // Bad: Re-exporting component in index.ts
     export * from './type'
     export * from './update'
     export * from './component'
     ```

8. **Using `msgCmd` Instead of Direct Message Handler Functions**:
   - **Why**: Do not use `msgCmd` to trigger internal state transitions unless there is absolutely no other choice (e.g. bridging external asynchronous events where direct function invocation is impossible). Using `msgCmd` creates an unnecessary extra dispatch cycle (`Cmd -> dispatch(Msg) -> update`), causes delayed state application, and prevents direct functional composition with `updateAndCmd` and `pipe`. Always prefer invoking message handler functions directly.
   - **Example**: In `@rinn7e/tea-cup-navigation` and consumer applications, call handler functions like `changeRouteHandler` directly instead of returning a `msgCmd`:
     ```typescript
     // Good: Call handler function directly in the pipeline
     return changeRouteHandler(navigationConfig, model.shared)(targetRoute, true)(model)

     // Bad: Wrapping in msgCmd to dispatch in a future cycle
     return [model, msgCmd({ _tag: 'ChangeRoute', route: targetRoute })]
     ```

9. **Deleting Existing Comments During Refactoring**:
   - **Why**: Never strip, delete, or overwrite existing comments, documentation notes, or JSDoc comments during code modifications and refactoring. Existing comments often explain subtle business logic, edge cases (e.g. backend error status caveats), test expectations, or TODO items. Preserving comments maintains codebase history and documentation integrity.
   - **Example**: In `update.ts`, keep all explanatory comments on API error handling and interceptors intact:
     ```typescript
     // Good: Preserve existing domain explanations and edge case comments
     // isUnavailable is true when the server is not responsive which results in not being able to validate if current token is valid or not.
     const isUnavailable =
       res.tag === 'Err' &&
       (res.err.statusCode === 500 ||
         res.err.statusCode === 0 ||
         // Err but 200 mean we have malformed json
         res.err.statusCode === 200)

     // Bad: Stripping out all explanatory comments during refactor
     const isUnavailable =
       res.tag === 'Err' &&
       (res.err.statusCode === 500 ||
         res.err.statusCode === 0 ||
         res.err.statusCode === 200)
     ```

10. **TEA Child Msg Interception**:
    - **Why**: When a parent component needs to intercept or respond to specific messages from its child components, use the `updateAndCmd` (or `updateAndCmdExtra`) pattern within a `pipe`. This keeps child message handling clean, modular, and declarative by delegating to the child component's `update` function and avoiding manual nested `switch` or `if-else` blocks for interception logic.
    - **Example**:
      ```typescript
      case 'ChildMsg': {
        const [newChildModel, childCmd] = Child.update(
          msg.subMsg,
          model.childModel,
        )

        return pipe(
          [
            { ...model, child: newChildModel },
            childCmd.map(
              (m) =>
                ({
                  _tag: 'ChildMsg' as const,
                  subMsg: m,
                }) as Msg,
            ),
          ],
          updateAndCmd((m) => {
            if (msg.subMsg._tag === 'MsgToIntercept') {
              return [
                { ...m, someParentField: true }, // Update parent model
                Cmd.none(), // Add parent commands
              ]
            } else {
              return [m, Cmd.none()]
            }
          }),
        )
      }
      ```

11. **No Legacy Backward Compatibility, Redundant Aliases, or Defensive Fallbacks (Clean-Slate Development)**:
    - **Why**: This project follows strict **Clean-Slate Development**. Never write defensive shims, redundant aliases, dual backward-compatible exports, redundant boilerplate constructor wrappers, or fallback chains anticipating obsolete naming or deprecated APIs. When renaming functions, message types, or models, always refactor all call sites directly across the library packages, example apps, and test suites to enforce the single canonical standard.
    - **No Redundant Alias or Boilerplate Constructor Wrappers**:
      - Never export dual names for backward compatibility.
      - Do not write trivial boilerplate constructor wrappers (`changeRouteMsg`, `noOpMsg`, etc.) when callers can directly instantiate type-safe tagged object literals (`{ _tag: 'ChangeRoute', route }`, `{ _tag: 'Refresh' }`, `{ _tag: 'ModifyRoute', func }`).
    - **Direct Refactoring Across All Layers**:
      - When updating an API signature or naming convention, update all consumers, example apps, and test suites directly rather than keeping obsolete shims.
    - **Example**:
      ```typescript
      // Good: Instantiate tagged message objects directly
      routerMsgHandler(
        {
          _tag: 'ModifyRoute',
          func: (r) => ({ ...r, page: r.page + 1 }),
        },
        model,
      )

      // Bad: Redundant boilerplate constructors or legacy alias wrappers
      export const modifyRouteMsg = (func) => ({ _tag: 'ModifyRoute', func })
      export const modifyRoute = modifyRouteMsg // Redundant alias
      ```
