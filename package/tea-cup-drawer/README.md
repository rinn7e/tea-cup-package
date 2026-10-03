# `@rinn7e/tea-cup-drawer`

A drawer (bottom sheet / side panel) for React and The Elm Architecture, powered by `tea-cup-fp` and `fp-ts`. It is a TEA port of [vaul](https://github.com/emilkowalski/vaul): the same drag physics, snap points and scroll-aware dragging, but every animation phase is an explicit state in your model.

---

## Features

- **Animation as data**: the drawer is always in exactly one `AnimateState` (`Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut`). Interruptions (close while opening, reopen while closing, grab while settling) are explicit transitions in `update`, not timers racing each other.
- **Payload kept while closing**: open the drawer with a payload (`{ _tag: 'Open', internal: item }`). It stays in the state until the drawer has fully slid away, so the content never goes blank mid-animation even if the parent already cleared its own data.
- **vaul's gestures**: swipe to dismiss with velocity and distance thresholds, rubber-banding past the open position, snap points (fractions or px), handle taps that cycle snap points, `handleOnly`, and drags that leave scrolled content and selected text alone.
- **Four directions**: `bottom`, `top`, `left`, `right`.
- **Modal or not**: modal drawers render an overlay, lock the body scroll (with vaul's iOS Safari fix), trap Tab and give focus back on close. Non-modal drawers leave the page interactive.
- **Memoized, with two data channels**: `DrawerMemo`'s `renderContent(content, contentDispatch, parent)` gets everything as arguments: the payload (owned by the drawer, dropped when it closes), a dispatch for the content's own messages, and `parent` (owned by the parent), each data channel with its own `Eq`.
- **Keyed content messages**: the payload is identified by `Config.uniqueKeyField` (like tea-cup-pagination's items and the screen stack's screens), so a reply from a payload that was closed or replaced never reaches the new one.
- **Pure, tested logic**: the physics (`decideDrag`, `decideRelease`, `dragDistance`, ...) are pure functions in `util.ts`. DOM reads happen at event time and reach `update` as facts inside messages.
- **Isolated React entrypoint**: types, `update` and `subscriptions` come from `@rinn7e/tea-cup-drawer`; views from `@rinn7e/tea-cup-drawer/component`.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-drawer
```

Peer dependencies:

```bash
pnpm add @rinn7e/tea-cup-prelude tea-cup-fp react-tea-cup fp-ts react react-dom
```

Import the drawer mechanics stylesheet once (positioning, transforms, transitions):

```ts
import '@rinn7e/tea-cup-drawer/drawer.css'
```

The default views use Tailwind classes for their look. With Tailwind v4, let it scan the package:

```css
@source '../node_modules/@rinn7e/tea-cup-drawer/lib';
```

---

## Quick Start

### 1. Model

The type parameter is the payload the drawer is opened with (`null` if you don't need one).

```ts
import * as Drawer from '@rinn7e/tea-cup-drawer'

export type Model = {
  actions: Drawer.Model<Message>
}

export type Msg = { _tag: 'ActionsMsg'; subMsg: Drawer.Msg<Message> }

export const init = (): [Model, Cmd<Msg>] => [
  {
    actions: Drawer.defaultModel(
      // The payload's key: here, the message's id
      Drawer.defaultConfig('message-actions', (message: Message) => message.id),
    ),
  },
  Cmd.none(),
]
```

Customize the config by spreading the defaults:

```ts
// No payload (`null`): a constant key
const config: Drawer.Config<null> = {
  ...Drawer.defaultConfig<null>('composer', () => 'composer'),
  modal: false,
  dismissible: false,
  snapPoints: [
    { _tag: 'Pixel', value: 120 },
    { _tag: 'Fraction', value: 1 },
  ],
}
```

### 2. Update and subscriptions

```ts
case 'ActionsMsg': {
  const [actions, cmd] = Drawer.update(msg.subMsg, model.actions)
  return [
    { ...model, actions },
    cmd.map((subMsg): Msg => ({ _tag: 'ActionsMsg', subMsg })),
  ]
}
```

```ts
export const subscriptions = (model: Model): Sub<Msg> =>
  Drawer.subscriptions(model.actions).map(
    (subMsg): Msg => ({ _tag: 'ActionsMsg', subMsg }),
  )
```

Open it from anywhere by sending `{ _tag: 'Open', internal: message }`, and close it with `{ _tag: 'Close' }`.

### 3. View

```tsx
import { DrawerHandle, DrawerMemo } from '@rinn7e/tea-cup-drawer/component'

const actionsDispatch = map(dispatch, (subMsg): Msg => ({
  _tag: 'ActionsMsg',
  subMsg,
}))

<DrawerMemo
  model={model.actions}
  dispatch={actionsDispatch}
  itemEq={MessageEq}
  parent={{ currentUserId: model.currentUserId }}
  parentEq={ParentEq}
  renderContent={(message, contentDispatch, parent) => (
    <>
      <DrawerHandle dispatch={actionsDispatch} />
      <MessageActions message={message} currentUserId={parent.currentUserId} />
    </>
  )}
/>
```

`DrawerMemo` re-renders only when the model (compared with `itemEq`) or `parent` (compared with `parentEq`) change. `renderContent` must therefore only use its arguments: the content sends its own messages with `contentDispatch` (see below), never with the owner's `dispatch`. `DrawerHandle` and controls such as a Close button use the drawer's own dispatch. Use `DrawerComponent` for the unmemoized version.

### `internal` vs `parent`

The content gets two kinds of data, like link-pagination's `Item` and `Parent`. Pick per piece of state with one question: **does it need to survive the drawer closing?**

|          | `internal` (`Item`)                                     | `parent` (`Parent`)                                                                            |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Owned by | The drawer                                              | The parent; the drawer only borrows it                                                         |
| Set by   | `Open { internal }`, `modifyContent`                    | Every render (`parent` prop)                                                                   |
| Lifetime | Kept while sliding out, dropped once closed             | Whatever the parent currently has                                                              |
| Use for  | State that lives and dies with the drawer (the default) | State that must outlive it (a draft), or that the parent owns anyway (current user, selection) |

### A TEA component as the content

Put the component's model in the payload. Its view sends messages with `contentDispatch`; they arrive as the drawer's `ContentMsg { key, msg }` (the payload's `uniqueKeyField`), which the drawer ignores and the owner intercepts with `updateAndCmd`, like tea-cup-pagination's item messages. Read and write the payload with `getContent(key)` / `modifyContent(key, f)`:

```ts
type Msg = { _tag: 'ActionsMsg'; subMsg: Drawer.Msg<Menu.Model, Menu.Msg> }

case 'ActionsMsg': {
  const subMsg = msg.subMsg
  const [actions, cmd] = Drawer.update(subMsg, model.actions)
  return pipe(
    [{ ...model, actions }, cmd.map((m): Msg => ({ _tag: 'ActionsMsg', subMsg: m }))],
    updateAndCmd((m) =>
      subMsg._tag === 'ContentMsg' ? menuMsgHandler(subMsg.key, subMsg.msg)(m) : [m, Cmd.none()],
    ),
  )
}

const menuMsgHandler = (key: string, menuMsg: Menu.Msg) => (model: Model) =>
  pipe(
    Drawer.getContent(key)(model.actions),
    O.fold(
      // Closed, or reopened with another payload: drop it
      () => [model, Cmd.none()],
      (menu) => {
        const [nextMenu, cmd] = Menu.update(menuMsg, menu)
        return [
          { ...model, actions: Drawer.modifyContent(key, () => nextMenu)(model.actions) },
          // Replies carry the same key
          cmd.map((m): Msg => ({ _tag: 'ActionsMsg', subMsg: { _tag: 'ContentMsg', key, msg: m } })),
        ]
      },
    ),
  )
```

The state then resets on every open and survives the close animation. **The key matters:** `Open` while the drawer is open or still closing replaces the payload. A reply from the old payload (e.g. a request it started) carries the old key, so `getContent` is `none` and it is dropped instead of being written into the new payload. Reopening for the _same_ entity gives the same key, so its replies are accepted; derive a key per open if even that must not happen.

The parent can still react in the same step with `updateAndCmd` (e.g. close the drawer once the menu picked something). The example app's "TEA content" demo shows the full pattern. Its "Side by side" demo shows the opposite choice: no payload (`Drawer.Model<null>`), a form owned by the parent and passed through `parent`, kept across close and reopen, and cleared only once the drawer reaches `Invisible` (clearing on `Close` would empty it while it slides away).

For a drawer with several screens (a menu whose "Move to ›" slides in a second screen with a back button), make the payload a screen stack from [`@rinn7e/tea-cup-screen-stack`](../tea-cup-screen-stack): `Drawer.Model<ScreenStack.Model<MenuScreen>>`. Its example app shows the full recipe.

### Reacting to open changes

The drawer closes itself on swipes, overlay taps and Escape. To react like vaul's `onOpenChange`, compare `isOpen` before and after the update:

```ts
case 'ActionsMsg': {
  const [actions, cmd] = Drawer.update(msg.subMsg, model.actions)
  return pipe(
    [{ ...model, actions }, cmd.map(...)],
    updateAndCmd((m) => {
      if (Drawer.isOpen(model.actions.animate) && !Drawer.isOpen(actions.animate)) {
        return [{ ...m, selected: O.none }, Cmd.none()]
      } else {
        return [m, Cmd.none()]
      }
    }),
  )
}
```

---

## State machine

```
Invisible ─Open→ Mounting ─(next paint)→ AnimateIn ─(transitionend)→ Visible
Visible   ─Close / Dismiss / swipe→ AnimateOut ─(transitionend)→ Invisible
Visible   ─pointer moves along the axis→ Dragging ─release→ Settling | AnimateOut
Settling  ─(transitionend)→ Visible
AnimateOut ─Open→ AnimateIn      (reverse from the current position)
AnimateIn  ─Close→ AnimateOut    (reverse from the current position)
```

Each animation bumps `model.seq`; `AnimationTimeout` (sent `durationMs + 50` after it starts) settles the state if `transitionend` never fires, and is ignored once a newer animation has started.

Before a drag starts, a press lives in `model.gesture` (`Pressed`). It becomes `Dragging` once the pointer moves along the axis and `decideDrag` allows it; otherwise the gesture belongs to the content (scrolling, horizontal swipes, text selection).

---

## Config

| Field                   | Default            | Description                                                                                                 |
| ----------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`                    | —                  | Unique id; the content element gets `id="tea-cup-drawer-<id>"`                                              |
| `direction`             | `'bottom'`         | Edge the drawer is attached to                                                                              |
| `modal`                 | `true`             | Overlay, body scroll lock, focus trap                                                                       |
| `dismissible`           | `true`             | When `false`, only `Close` closes the drawer                                                                |
| `snapPoints`            | `[]`               | `{ _tag: 'Fraction', value }` or `{ _tag: 'Pixel', value }`; the drawer must span the screen along its axis |
| `initialSnap`           | `0`                | Snap index the drawer opens at                                                                              |
| `fadeFromIndex`         | `O.none`           | Snap index from which the overlay is opaque (`none` = last)                                                 |
| `snapToSequentialPoint` | `false`            | Flicks move one snap point instead of jumping to the edge                                                   |
| `handleOnly`            | `false`            | Only `DrawerHandle` starts a drag                                                                           |
| `autoFocus`             | `false`            | Focus the first focusable element on open (instead of the drawer)                                           |
| `closeThreshold`        | `0.25`             | Fraction of the drawer a slow swipe must cover to close                                                     |
| `velocityThreshold`     | `0.4`              | px/ms above which a swipe is a flick                                                                        |
| `scrollLockTimeout`     | `100`              | ms after a content scroll during which dragging stays off                                                   |
| `durationMs`            | `500`              | Transition duration                                                                                         |
| `noBodyStyles`          | `false`            | Don't touch `document.body` (scroll lock)                                                                   |
| `portal`                | `{ _tag: 'Body' }` | `Body`, `Inline` or `{ _tag: 'Container', get }`                                                            |
| `ui`                    | —                  | `{ content?, overlay? }` view overrides                                                                     |

Escape and the Tab trap apply to the topmost open drawer only (the most recently opened), like Radix's layer stack.

Mark elements that should never start a drag with `data-drawer-no-drag` (e.g. sliders, carousels).

---

## Customizing the view

`className` / `overlayClassName` on `DrawerComponent` merge into the default views. For full control, give `config.ui.content` / `config.ui.overlay` a render function and spread `attrs` on your element:

```tsx
ui: {
  content: ({ attrs, children }) => (
    <section {...attrs} className='bg-zinc-900 text-white'>
      {children}
    </section>
  ),
}
```

Style per phase with the `data-state` attribute (e.g. `data-[state=Dragging]:shadow-2xl`).

---

## Differences from vaul

Not ported (yet): background scaling (`shouldScaleBackground`), nested drawers, keyboard-aware repositioning (`repositionInputs`, `fixed`), vaul's iOS touch-move scroll prevention (the body lock and Safari `position: fixed` are ported), `preventScrollRestoration`, and the handle's double-tap / long-press timing. `onDrag` / `onRelease` / `onAnimationEnd` callbacks are replaced by intercepting the drawer's messages.

---

## Development

```bash
pnpm --filter @rinn7e/tea-cup-drawer staged          # format, check, lint, unit tests
pnpm --filter tea-cup-drawer-example dev             # kitchen sink on http://localhost:5183
pnpm --filter tea-cup-drawer-example-e2e test        # Playwright suite
```

---

## License

MIT. The gesture logic is ported from vaul, Copyright (c) 2023 Emil Kowalski, MIT; see [LICENSE](LICENSE).
