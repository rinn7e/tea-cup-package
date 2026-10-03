# `@rinn7e/tea-cup-screen`

Show one screen out of several and animate the switch between them, for React and The Elm Architecture, powered by `tea-cup-fp` and `fp-ts`. The first use is a multi-screen bottom sheet: tap "Move to ›" in a menu, a "Move to" screen slides in with a back button and the sheet smoothly changes height; ‹ slides back.

---

## Features

- **A screen stack** (like iOS `UINavigationController`): `Push` goes deeper, `Pop` goes back, `PopTo` goes back several screens in one slide (like iOS `popToRoot`), `Replace` swaps the top screen. Popped screens are discarded; the screens underneath keep their state.
- **Animation as data**: the stack is always `Idle` or `Sliding` (`Forward` / `Back`, phase `Start` / `Run`). The outgoing screen is kept in the transition until it has slid away, and interruptions (push or pop while sliding) are explicit branches in `update`.
- **Height animation**: each screen is measured (`ResizeObserver`) and the container animates between heights, including when the content of the screen on show changes.
- **Your own screen union**: screens are one sum type you define; each case may carry its own TEA model. Adding a screen adds a case, nothing else grows.
- **Works anywhere**: inside a drawer (the whole stack is the drawer's payload) or on its own (a wizard in a card). The drawer does not depend on this package.
- **Memoized**: `ScreenStackMemo` re-renders only when the stack (`itemEq`) or `parent` (`parentEq`) change.
- **Accessible**: the outgoing screen is `inert` while it slides away, and the focus moves to the new screen when it was inside the stack (never stolen from the rest of the page).
- **Isolated React entrypoint**: types and `update` come from `@rinn7e/tea-cup-screen`; views from `@rinn7e/tea-cup-screen/component`. No stylesheet: the mechanics are inline styles, the screens style themselves.

### Stack and Tabs

The package is built around a shared transition engine (one screen on show, the outgoing one kept while it slides, direction, height). This version ships the **Stack**, where the screen on show is the top of a history. **Tabs** (a fixed set of siblings with one selected, each keeping its state, like `UITabBarController`) are planned on the same `Transition` type.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-screen
```

Peer dependencies:

```bash
pnpm add @rinn7e/tea-cup-prelude tea-cup-fp react-tea-cup fp-ts react react-dom
```

---

## Quick Start

### 1. Your screens

```ts
import * as Screen from '@rinn7e/tea-cup-screen'

export type WizardStep =
  | { _tag: 'Account'; email: string }
  | { _tag: 'Plan'; plan: Plan }
  | { _tag: 'Summary'; email: string; plan: Plan }

export type Model = { steps: Screen.Stack<WizardStep> }

export type Msg =
  | { _tag: 'StackMsg'; subMsg: Screen.Msg<WizardStep> }
  | { _tag: 'SetEmail'; email: string }
  | { _tag: 'Next' }

export const init = (): [Model, Cmd<Msg>] => [
  {
    steps: Screen.defaultModel(Screen.defaultConfig('wizard'), {
      _tag: 'Account',
      email: '',
    }),
  },
  Cmd.none(),
]
```

`Screen.defaultConfig(id)` uses 300ms transitions. Pass `durationMs: 0` to switch screens without animation (e.g. for `prefers-reduced-motion`).

### 2. Update

Delegate stack messages, and push or pop by calling the handlers directly:

```ts
const withStack =
  (model: Model) =>
  ([steps, cmd]: [Screen.Stack<WizardStep>, Cmd<Screen.Msg<WizardStep>>]): [
    Model,
    Cmd<Msg>,
  ] => [
    { ...model, steps },
    cmd.map((subMsg): Msg => ({ _tag: 'StackMsg', subMsg })),
  ]

case 'StackMsg':
  return withStack(model)(Screen.update(msg.subMsg, model.steps))
case 'Next':
  return withStack(model)(
    Screen.pushHandler<WizardStep>({ _tag: 'Plan', plan: 'Free' })(model.steps),
  )
```

**Screen messages go to the screen on show.** Match the message against `Screen.getTop`, update that screen and store it back with `Screen.setTop`. A message for a screen that is no longer on top (popped, or sliding away) is stale: drop it.

```ts
case 'SetEmail': {
  const top = Screen.getTop(model.steps)
  if (top._tag === 'Account') {
    return [
      { ...model, steps: Screen.setTop<WizardStep>({ ...top, email: msg.email })(model.steps) },
      Cmd.none(),
    ]
  } else {
    // Stale
    return [model, Cmd.none()]
  }
}
```

### 3. View

```tsx
import { ScreenStackMemo } from '@rinn7e/tea-cup-screen/component'

;<ScreenStackMemo
  model={model.steps}
  dispatch={map(dispatch, (subMsg): Msg => ({ _tag: 'StackMsg', subMsg }))}
  itemEq={WizardStepEq}
  parent={null}
  parentEq={nullEq}
  renderScreen={(step, depth) => stepView(step, depth, dispatch)}
/>
```

`depth` is the screen's index in the stack (0 = the root): show a back button (`{ _tag: 'Pop' }`) when it is above 0. `renderScreen` must only use its arguments and stable values like `dispatch`; pass parent-owned state through `parent`. Give the screens an opaque background: the incoming screen slides over the outgoing one.

---

## With a drawer

The whole stack is the drawer's `Item`. The drawer does not know about screens:

```ts
type MenuScreen = { _tag: 'Main' } | { _tag: 'MoveTo'; moveTo: MoveTo.Model }

type Model = { menuDrawer: Drawer.Model<Screen.Stack<MenuScreen>> }

// Open: every open starts at the first screen
Drawer.update(
  {
    _tag: 'Open',
    internal: Screen.defaultModel<MenuScreen>(Screen.defaultConfig('menu'), {
      _tag: 'Main',
    }),
  },
  model.menuDrawer,
)

// Route stack and screen messages through the drawer payload; once the
// drawer has closed, late messages are dropped
const withMenuStack =
  (f: (stack: MenuStack) => [MenuStack, Cmd<Msg>]) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getInternal(model.menuDrawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (stack): [Model, Cmd<Msg>] => {
          const [next, cmd] = f(stack)
          return [
            {
              ...model,
              menuDrawer: Drawer.setInternal(next)(model.menuDrawer),
            },
            cmd,
          ]
        },
      ),
    )
```

```tsx
<DrawerMemo
  model={model.menuDrawer}
  dispatch={menuDrawerDispatch}
  itemEq={Screen.getStackEq(MenuScreenEq)}
  parent={null}
  parentEq={nullEq}
>
  {(stack) => (
    <ScreenStackComponent
      model={stack}
      dispatch={menuStackDispatch}
      itemEq={MenuScreenEq}
      parent={null}
      parentEq={nullEq}
      renderScreen={(screen, depth) => menuScreenView(screen, depth, dispatch)}
    />
  )}
</DrawerMemo>
```

What the drawer gives for free: the stack resets on every open, the last screen stays visible while the drawer slides away, and late messages after close are dropped. Escape and the overlay close the **whole drawer** (as on iOS); the screen's back button sends `Pop`. Inside `DrawerMemo`, the non-memoized `ScreenStackComponent` is enough.

---

## State machine

```
Idle ─Push/Pop→ Sliding Start ─(next paint)→ Sliding Run ─(transitionend)→ Idle
```

- **Push**: the new screen is added; `from` is the previous top. Direction `Forward`: the new screen slides in from the end edge while the previous one moves back by 30% (iOS parallax).
- **Pop**: the top screen is removed from the stack but kept in `from` until it has slid out. Direction `Back`. Ignored on the root screen.
- **PopTo(depth)**: back to the screen at `depth` in one slide straight from the top; the screens in between are discarded without being shown. To restart a flow, `popToHandler(0)` then `setTop` a fresh first screen.
- **Replace**: swaps the top screen without animation.
- **Push or Pop while sliding**: the running transition finishes at once, then the new one starts.
- `Start` renders both screens at their start positions and waits for a paint (bounded to 100ms, as browsers throttle frames in hidden tabs); `Run` switches them to their end positions so the CSS transition runs. A `TransitionTimeout` settles the stack if `transitionend` never fires. Frame and timeout messages carry a `seq` and are ignored once another transition started.

## Helpers

| Helper                                                                               |                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `getTop(stack)`                                                                      | The screen on show                             |
| `setTop(screen)(stack)`                                                              | Store the updated top screen                   |
| `depth(stack)`                                                                       | Index of the screen on show (0 = root)         |
| `canPop(stack)`                                                                      | Whether `Pop` does anything                    |
| `pushHandler(screen)`, `popHandler`, `popToHandler(depth)`, `replaceHandler(screen)` | The `update` branches, to call directly        |
| `getStackEq(itemEq)`                                                                 | `Eq` of the stack, e.g. as a drawer's `itemEq` |

## DOM

- Container: `id="<config.id>-screen-stack"`, `data-screen-stack`, `data-state` (`Idle` / `Sliding`), `data-direction`, `data-phase`.
- Panels: `id="<config.id>-screen-<depth>"`, `tabIndex={-1}`, `data-screen-depth`, `data-screen-role` (`Top` / `From`).

---

## Development

```bash
pnpm --filter @rinn7e/tea-cup-screen test           # unit tests (Vitest)
pnpm --filter tea-cup-screen-example dev             # kitchen sink on http://localhost:5184
pnpm --filter tea-cup-screen-example-e2e test        # Playwright suite
```

The example app shows both uses: a drawer menu with a "Move to" screen (its own TEA model with a simulated request) and a "New folder" screen, and a standalone sign-up wizard.

## License

MIT
