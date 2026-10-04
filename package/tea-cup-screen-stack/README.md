# `@rinn7e/tea-cup-screen-stack`

Show one screen out of several and animate the switch between them, for React and The Elm Architecture, powered by `tea-cup-fp` and `fp-ts`. The first use is a multi-screen bottom sheet: tap "Move to ›" in a menu, a "Move to" screen slides in with a back button and the sheet smoothly changes height; ‹ slides back.

---

## Features

- **A screen stack** (like iOS `UINavigationController`): `Push` goes deeper, `Pop` goes back, `PopTo` goes back several screens in one slide (like iOS `popToRoot`), `Replace` swaps the top screen. Popped screens are discarded; the screens underneath keep their state.
- **Animation as data**: the stack is always `Idle`, `Pushing` or `Popping` (phase `Start` / `Run`). The screens in flight live in the transition until they have slid away, and interruptions (push or pop while sliding) are explicit branches in `update`.
- **Impossible states are impossible**: see [Data model](#data-model).
- **Height animation**: each screen is measured (`ResizeObserver`) and the container animates between heights, including when the content of the screen on show changes.
- **Your own screen union**: screens are one sum type you define; each case may carry its own TEA model. Adding a screen adds a case, nothing else grows.
- **Works anywhere**: inside a drawer (the whole stack is the drawer's payload) or on its own (a wizard in a card). The drawer does not depend on this package.
- **Memoized**: `ScreenStackMemo` re-renders only when the stack (`itemEq`) or `parent` (`parentEq`) change.
- **Accessible**: the outgoing screen is `inert` while it slides away, and the focus moves to the new screen when it was inside the stack (never stolen from the rest of the page).
- **Isolated React entrypoint**: types and `update` come from `@rinn7e/tea-cup-screen-stack`; views from `@rinn7e/tea-cup-screen-stack/component`. No stylesheet: the mechanics are inline styles, the screens style themselves.

### Not tabs

Tabs (a fixed set of siblings with one selected, like `UITabBarController`) look similar but are a different component: their data overlaps (a stack is a selection list with nothing after the selected item), but their messages don't (tabs have no push or pop; going back to a left tab keeps the one you left). They are planned as a separate package, see `docs/plan-tea-cup-screen-tabs.md` at the repo root.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-screen-stack
```

Peer dependencies:

```bash
pnpm add @rinn7e/tea-cup-prelude tea-cup-fp react-tea-cup fp-ts react react-dom
```

---

## Quick Start

### 1. Your screens and their messages

```ts
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'

export type Step =
  | { _tag: 'Account'; email: string }
  | { _tag: 'Plan'; plan: Plan }
  | { _tag: 'Summary'; email: string; plan: Plan }

// Every screen has a unique key (like tea-cup-pagination's `uniqueKeyField`)
export const stepKey = (step: Step): string => {
  switch (step._tag) {
    case 'Account':
      return 'account' // appears once: a constant
    case 'Plan':
      return 'plan'
    case 'Summary':
      return 'summary'
  }
}

// What the user did on a step. The step only says it; the parent decides
export type StepMsg =
  | { _tag: 'SetEmail'; email: string }
  | { _tag: 'Next' }
  | { _tag: 'Back' }

export type Model = { steps: ScreenStack.Model<Step> }

export type Msg = {
  _tag: 'ScreenStackMsg'
  subMsg: ScreenStack.Msg<Step, StepMsg>
}

export const defaultModel = (): Model => ({
  steps: ScreenStack.defaultModel<Step>(
    ScreenStack.defaultConfig('wizard', stepKey),
    { _tag: 'Account', email: '' },
  ),
})
```

- **Keys are unique within a stack.** A `Push` (or `Replace`, `setTop`) whose key is already in the stack is ignored. Derive the key from the screen: a constant for a screen that appears once, or from its data for one that can repeat (`` `folder-${id}` ``). A screen's key must not change.
- `ScreenStack.Msg<Item, ItemMsg>`: `ItemMsg` is the screens' own messages; leave it out (`never`) when they have none.
- `defaultConfig(id, uniqueKeyField)` uses 300ms transitions. Pass `durationMs: 0` to switch screens without animation (e.g. for `prefers-reduced-motion`).

### 2. Update: intercept screen messages

A screen's message arrives as the stack's `ScreenMsg { key, msg }`. The stack ignores it; the parent intercepts it with `updateAndCmd` (the child message interception pattern), like tea-cup-pagination's `ItemMsg`:

```ts
const withStack = ([steps, cmd]: [
  ScreenStack.Model<Step>,
  Cmd<ScreenStack.Msg<Step, StepMsg>>,
]): [Model, Cmd<Msg>] => [
  { steps },
  cmd.map((subMsg): Msg => ({ _tag: 'ScreenStackMsg', subMsg })),
]

const stepMsgHandler =
  (key: string, msg: StepMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'SetEmail':
        // Updates the step with that key, wherever it is in the stack
        return [
          {
            steps: ScreenStack.modifyScreen<Step>(key, (step) =>
              step._tag === 'Account' ? { ...step, email: msg.email } : step,
            )(model.steps),
          },
          Cmd.none(),
        ]
      case 'Next':
        return withStack(
          ScreenStack.pushHandler<Step>({
            _tag: 'Plan',
            plan: 'Free',
          })<StepMsg>(model.steps),
        )
      case 'Back':
        return withStack(ScreenStack.popHandler<Step, StepMsg>(model.steps))
    }
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  const subMsg = msg.subMsg
  return pipe(
    withStack(ScreenStack.update(subMsg, model.steps)),
    updateAndCmd((m) =>
      subMsg._tag === 'ScreenMsg'
        ? stepMsgHandler(subMsg.key, subMsg.msg)(m)
        : [m, Cmd.none()],
    ),
  )
}
```

**Messages are routed by key, not by "is it on top".** `getScreen(key)` / `modifyScreen(key, f)` find the screen wherever it is: on show, underneath (a reply to a request it started before another screen was pushed), or still sliding away. Only once it has been popped do they return `none` / the same model, and the message is dropped. A reply (an API response) must carry the same key, so it acts on the screen's value when it arrives.

### 3. View

```tsx
import { ScreenStackMemo } from '@rinn7e/tea-cup-screen-stack/component'

;<ScreenStackMemo
  model={model.steps}
  dispatch={map(
    dispatch,
    (subMsg): Msg => ({ _tag: 'ScreenStackMsg', subMsg }),
  )}
  itemEq={StepEq}
  parent={null}
  parentEq={nullEq}
  renderScreen={(step, stepDispatch, depth) =>
    stepView(step, stepDispatch, depth)
  }
/>
```

- **`screenDispatch`** (here `stepDispatch`) sends a `ScreenMsg` with the screen's key, like tea-cup-pagination's `itemDispatch`. A screen view needs nothing else: navigation (Next, Back) is a screen message too, which the parent intercepts. Don't pass the parent's `dispatch` into screen views.
- `depth` is the screen's index in the stack (0 = the root), e.g. to show a back button above 0.
- `renderScreen` must only use its arguments; pass parent-owned state through `parent`.
- Give the screens an opaque background: the incoming screen slides over the outgoing one.

---

## With a drawer

The whole stack is the drawer's payload, and the stack's messages are the drawer content's messages. The drawer does not know about screens:

```ts
type MenuStackMsg = ScreenStack.Msg<MenuScreen, MenuScreenMsg>

type Model = {
  drawer: Drawer.Model<ScreenStack.Model<MenuScreen>>
}

type Msg = {
  _tag: 'DrawerMsg'
  subMsg: Drawer.Msg<ScreenStack.Model<MenuScreen>, MenuStackMsg>
}

// A stack has no identity of its own: a constant content key. Screen
// messages inside it are routed by screen key.
const drawerConfig = Drawer.defaultConfig<MenuStack>('menu', () => 'menu', {
  // A fixed name: every screen has its own title, and two are rendered
  // while the stack slides
  label: { _tag: 'Text', value: 'Message menu' },
  describedBy: O.none,
})

// Open: every open starts at the first screen
Drawer.update(
  {
    _tag: 'Open',
    internal: ScreenStack.defaultModel<MenuScreen>(
      ScreenStack.defaultConfig('menu', menuScreenKey),
      { _tag: 'Main' },
    ),
  },
  model.drawer,
)

// The stack's messages arrive as the drawer's `ContentMsg`: intercept them
// and run the stack update on the payload. Once the drawer has closed,
// `getContent` is `none` and late messages are dropped.
const withMenuStack =
  (f: (stack: MenuStack) => [MenuStack, Cmd<Msg>]) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getContent('menu')(model.drawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (stack): [Model, Cmd<Msg>] => {
          const [next, cmd] = f(stack)
          return [
            {
              ...model,
              drawer: Drawer.modifyContent<MenuStack>(
                'menu',
                () => next,
              )(model.drawer),
            },
            cmd,
          ]
        },
      ),
    )
```

```tsx
<DrawerMemo
  model={model.drawer}
  dispatch={drawerDispatch}
  itemEq={ScreenStack.getModelEq(MenuScreenEq)}
  parent={null}
  parentEq={nullEq}
  renderContent={(stack, contentDispatch) => (
    <ScreenStackComponent
      model={stack}
      dispatch={contentDispatch}
      itemEq={MenuScreenEq}
      parent={null}
      parentEq={nullEq}
      renderScreen={(screen, screenDispatch, depth) =>
        menuScreenView(screen, screenDispatch, depth)
      }
    />
  )}
/>
```

What the drawer gives for free: the stack resets on every open, the last screen stays visible while the drawer slides away, and late messages after close are dropped. The overlay closes the **whole drawer** (as on iOS); a screen's back button sends its own `Back` message, which the parent turns into a pop. Inside `DrawerMemo`, the non-memoized `ScreenStackComponent` is enough.

---

## State machine

```
Idle ─Push→ Pushing Start ─(next paint)→ Pushing Run ─(transitionend)→ Idle
Idle ─Pop─→ Popping Start ─(next paint)→ Popping Run ─(transitionend)→ Idle
```

- **Push**: the new screen becomes `top`; the previous top is held as `previous` while the new one slides in from the end edge and it moves back by 30% (iOS parallax). Ignored when the key is already in the stack.
- **Pop**: the top screen is removed from the stack but held in `popped` until it has slid out. Ignored on the root screen.
- **PopTo(depth)**: back to the screen at `depth` in one slide straight from the top; the screens in between are discarded without being shown. To restart a flow, `popToHandler(0)` then `setTop` a fresh first screen.
- **Replace**: swaps the top screen without animation (ignored when the key belongs to another screen).
- **Push or Pop while sliding**: the running transition finishes at once, then the new one starts.
- `Start` renders both screens at their start positions and waits for a paint (bounded to 100ms, as browsers throttle frames in hidden tabs); `Run` switches them to their end positions so the CSS transition runs. A `TransitionTimeout` settles the stack if `transitionend` never fires. Frame and timeout messages carry a `seq` and are ignored once another transition started.

## Data model

The model makes impossible states impossible. The screens in flight live **in the transition**, not in the stack, so each screen exists in exactly one place and every depth follows from the structure:

```ts
type Entry<Item> = { screen: Item; height: Option<number> }

// `uniqueKeyField` identifies each screen; keys are unique within the stack

type Transition<Item> =
  | { _tag: 'Idle' }
  // `previous` (the old top) slides back while `top` slides in; joins `below` once done
  | { _tag: 'Pushing'; previous: Entry<Item>; phase: 'Start' | 'Run' }
  // the popped screens (last = the old top) slide away; dropped once done
  | {
      _tag: 'Popping'
      popped: NonEmptyArray<Entry<Item>>
      phase: 'Start' | 'Run'
    }

type Model<Item> = {
  below: Entry<Item>[] // root first
  top: Entry<Item>
  transition: Transition<Item>
  seq: number
  config: Config<Item> // { id, durationMs, uniqueKeyField }
}
```

- There is always a screen on show (`top`), and a push always has a screen to slide over (`previous`).
- No stored direction or outgoing depth that could disagree with the stack: the tag is the direction, `previous` sits at `depth - 1`, and the old top of a pop at `depth + popped.length`.
- The outgoing screen of a push is not a copy of the screen below the top, so the two can't diverge.
- Heights are stored with their screens, so they leave with them.
- Two screens can't share a key: pushes and replaces that would duplicate one are ignored, and `modifyScreen` can't change a key.

Read it through the helpers below rather than the fields: while pushing, `below` doesn't include the screen being slid over.

## Helpers

| Helper                                                                               |                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `getScreen(key)(stack)`                                                              | The screen with `key`, wherever it is in the stack (`none` once popped)  |
| `modifyScreen(key, f)(stack)`                                                        | Update that screen; the same stack when it's gone or `f` changes its key |
| `screens(stack)`                                                                     | All screens, root first                                                  |
| `getTop(stack)`                                                                      | The screen on show                                                       |
| `setTop(screen)(stack)`                                                              | Replace the top screen (its key must not belong to another screen)       |
| `depth(stack)`                                                                       | Index of the screen on show (0 = root)                                   |
| `canPop(stack)`                                                                      | Whether `Pop` does anything                                              |
| `pushHandler(screen)`, `popHandler`, `popToHandler(depth)`, `replaceHandler(screen)` | The `update` branches, to call directly                                  |
| `getModelEq(itemEq)`                                                                 | `Eq` of the stack, e.g. as a drawer's `itemEq`                           |

## DOM

- Container: `id="<config.id>-screen-stack"`, `data-screen-stack`, `data-state` (`Idle` / `Pushing` / `Popping`), `data-phase`.
- Panels: `id="<config.id>-screen-<depth>"`, `tabIndex={-1}`, `data-screen-depth`, `data-screen-role` (`Top` / `From`).

---

## Development

```bash
pnpm --filter @rinn7e/tea-cup-screen-stack test           # unit tests (Vitest)
pnpm --filter tea-cup-screen-stack-example dev             # kitchen sink on http://localhost:5184
pnpm --filter tea-cup-screen-stack-example-e2e test        # Playwright suite
```

The example app has one child component per use: a drawer menu (`menu-drawer`, with its "Move to" and "New folder" screens as sub-components; Move to has its own TEA model and a simulated request that may answer while another screen is on top), a standalone sign-up wizard, and a settings menu with free navigation.

## License

MIT
