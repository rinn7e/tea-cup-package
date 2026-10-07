# `@rinn7e/tea-cup-drawer`

A drawer (bottom sheet / side panel) for React and The Elm Architecture, powered by `tea-cup-fp` and `fp-ts`. It is a TEA port of [vaul](https://github.com/emilkowalski/vaul): the same drag physics, snap points and scroll-aware dragging, but every animation phase is an explicit state in your model.

---

## Features

- **Animation as data**: the drawer is always in exactly one `AnimateState` (`Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut`). Interruptions (close while opening, reopen while closing, grab while settling) are explicit transitions in `update`, not timers racing each other.
- **Payload kept while closing**: open the drawer with a payload (`{ _tag: 'Open', internal: item }`). It stays in the state until the drawer has fully slid away, so the content never goes blank mid-animation even if the parent already cleared its own data.
- **vaul's gestures**: swipe to dismiss with velocity and distance thresholds, rubber-banding past the open position, snap points (fractions or px), handle taps that cycle snap points, `handleOnly`, and drags that leave scrolled content and selected text alone, on every side (a swipe on a side drawer's table that scrolls sideways scrolls the table).
- **Four directions**: `bottom`, `top`, `left`, `right`.
- **Modal or not**: modal drawers render an overlay, lock the body scroll (with vaul's iOS Safari fix, which also works for app shells whose page scrolls inside its own containers), move the focus into the drawer and give it back on close. Non-modal drawers leave the page interactive.
- **Above the on-screen keyboard**: a bottom drawer whose text field is focused sits above the keyboard, capped to the visible height, until the keyboard closes (`repositionInputs`, on by default).
- **No keyboard listener**: keys (Escape, Tab) belong to the owner, who knows the app's other layers (dialogs, popups of other libraries) and sends `Dismiss` or `Close`. See [Keyboard](#keyboard).
- **Accessible name**: `config.aria` names the `role="dialog"` with a text or with its title element, and can point at a description.
- **Snap points that follow the content**: `SetSnapPoints` replaces them while open (e.g. measured from the content), keeping the active one.
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
      Drawer.defaultConfig(
        'message-actions',
        (message: Message) => message.id,
        {
          // Named by its title element, whose text may follow the payload
          label: { _tag: 'ElementId', id: 'message-actions-title' },
          describedBy: O.none,
        },
      ),
    ),
  },
  Cmd.none(),
]
```

Customize the config by spreading the defaults. A fourth argument sets the view overrides (`ui`, see [Customizing the view](#customizing-the-view)):

```ts
// No payload (`null`): a constant key
const config: Drawer.Config<null> = {
  ...Drawer.defaultConfig<null>('composer', () => 'composer', {
    label: { _tag: 'Text', value: 'Composer' },
    describedBy: O.none,
  }),
  modality: { _tag: 'NonModal' },
  dismissible: false,
  snap: {
    _tag: 'Snap',
    // A zipper: `active` is the snap point it opens at
    initial: {
      before: [],
      active: { _tag: 'Pixel', value: 120 },
      after: [{ _tag: 'Fraction', value: 1 }],
    },
    fadeFrom: O.none,
    sequential: false,
  },
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

Open it from anywhere by sending `{ _tag: 'Open', internal: message }`, and close it with `{ _tag: 'Close' }`. The subscriptions only follow a drag in progress; the drawer listens to no keys (see [Keyboard](#keyboard)).

To show it without sliding in (e.g. a page restored from the URL on load), add `skipAnimation: true`: a closed drawer appears at its open position at once, and the focus moves in once it is painted. Leave it out for anything the user does. A drawer already on screen ignores it and moves as usual (closing still animates).

### 3. View

```tsx
import { DrawerMemo, drawerHandleView } from '@rinn7e/tea-cup-drawer/component'

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
      {drawerHandleView(model.actions.config, actionsDispatch)}
      <MessageActions message={message} currentUserId={parent.currentUserId} />
    </>
  )}
/>
```

`DrawerMemo` re-renders only when the model (compared with `itemEq`) or `parent` (compared with `parentEq`) change. `renderContent` must therefore only use its arguments: the content sends its own messages with `contentDispatch` (see below), never with the owner's `dispatch`. `drawerHandleView(config, dispatch, className?)` (the drag handle, in the config's `ui.handle` look) and controls such as a Close button use the drawer's own dispatch. Use `DrawerComponent` for the unmemoized version.

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

### Why a key when the drawer holds only one content?

A drawer holds at most one content **at a time**, but not the same one **over time**. The key does not tell siblings apart (there are none); it tells the content _now_ apart from the content _before_ it, while a reply of the old one may still be in flight. Take one drawer shared by a list of messages, opened by a long press:

```
1. Open for message A    key 'A'   A's content starts a request
2. Open for message B    key 'B'   the drawer now holds B (even if A was still sliding away)
3. A's result arrives    ContentMsg { key: 'A' } → getContent('A') is none → dropped
4. B is untouched; B's own result arrives with key 'B' → applied
```

Without a key, "the content" would mean "whatever the drawer holds when the message arrives", and A's result would be written into B.

- `Config.id` identifies the **drawer** (`'actions'`: DOM ids, focus) and never changes; `uniqueKeyField` identifies its **content** (`'A'`, then `'B'`).
- Protection only covers replies routed back as a `ContentMsg` with the content's key, i.e. the content's commands mapped with the same key as in the recipe above.
- Reopening for the same entity (A, then A again) gives the same key, so the earlier open's result is accepted by the new one, the same rule as tea-cup-link-pagination's `dataSourceId`, which guards its single current data source the same way. Put a per-open id in the payload and key on it if every open must start fresh.
- A drawer without payload (`Drawer.Model<null>`) uses a constant key (`() => 'basic'`): there is nothing to tell apart.

The same reasoning applies to any component with a single child slot that can be refilled: identify the child by a key, not by "whatever is there now".

### Keyboard

The drawer has no keyboard listener. Which layer a key belongs to is an app-wide question (a dialog, a popup of another library or a second drawer may sit on top), so the owner answers it with whatever layer stack the app keeps, and tells the drawer:

```ts
// In the owner, when its layer is the topmost one
case 'EscapePressed':
  // `Dismiss` respects `dismissible`; `Close` always closes
  return drawerMsgHandler({ _tag: 'Dismiss' })(model)
```

Trapping Tab is the owner's too, for the same reason. On open, the drawer still moves the focus into itself (or its first focusable element with `autoFocus`), and once closed gives it back to where it was, unless the focus has moved on meanwhile (e.g. to a drawer opened while this one was closing).

### Accessible name

A `role="dialog"` needs a name, so `config.aria.label` is required:

- `{ _tag: 'Text', value }` renders `aria-label`: a fixed name.
- `{ _tag: 'ElementId', id }` renders `aria-labelledby`: the id of an element inside the content, usually its title, whose text may change with the payload ("Actions for message A").

`config.aria.describedBy` optionally points at an element describing the drawer (`aria-describedby`).

### Snap points that follow the content

When a snap point depends on the content (a composer that grows with its text), measure it in the content and send the drawer `SetSnapPoints`. It keeps the active index (clamped to the new points), moves to the new position of the active point if it changed, and leaves the model untouched when the points are the same, so content that re-measures on every render doesn't loop:

```ts
// The content reports its compact height as a `ContentMsg`; the owner intercepts it
case 'Measured':
  return drawerMsgHandler({
    _tag: 'SetSnapPoints',
    points: [
      { _tag: 'Pixel', value: msg.px },
      { _tag: 'Fraction', value: 1 },
    ],
  })(model)
```

The points last until the drawer closes: every open starts again from `config.snap`, and `SetSnapPoints` is ignored while it is closed or without snap points. Measure from the content (it renders while `Mounting`, before sliding in), not before opening.

### Reacting to open changes

The drawer closes itself on swipes and overlay taps. To react like vaul's `onOpenChange`, compare `isOpen` before and after the update:

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
Invisible ─Open { skipAnimation }→ Visible   (focus moved in on FocusFrame, after the next paint)
Visible   ─Close / Dismiss / swipe→ AnimateOut ─(transitionend)→ Invisible
Visible   ─pointer moves along the axis→ Dragging ─release→ Settling | AnimateOut
Settling  ─(transitionend)→ Visible
AnimateOut ─Open→ AnimateIn      (reverse from the current position)
AnimateIn  ─Close→ AnimateOut    (reverse from the current position)
```

Each animation bumps `model.seq`; `AnimationTimeout` (sent `durationMs + 50` after it starts) settles the state if `transitionend` never fires, and is ignored once a newer animation has started.

A press can only start at rest, so only `Visible` and `Settling` carry a `gesture` (`Idle` / `Pressed`). It becomes `Dragging` once the pointer moves along the axis and `decideDrag` allows it; `Dragging` then holds the press, so it exists in one place. Otherwise the gesture belongs to the content (scrolling, swipes across the axis, text selection). A press inside a scroller that takes the gesture (`scrollerTakesGesture`) scrolls it: in a top or bottom drawer, while the scroller can still move the way a closing drag goes (a bottom sheet's list away from its top; at its top a swipe down closes the sheet, as on iOS); in a left or right drawer, whenever it scrolls sideways, at any position (the drawer is dragged from the rest of its content). For 500ms after the drawer opens or reaches its last snap point (`model.openedAt`, vaul's `openTime`), the gesture is left to the content too: its content may be scrollable. These checks run for every direction; vaul skips them for left and right drawers.

The model can't represent impossible states (see the code convention): no press while invisible, opening or closing; no active snap point without snap points (`model.snap` is `NoSnap` or a zipper of the points, so the active one always exists); no snap settings without snap points; no body-lock setting on a non-modal drawer. `config.snap` (`SnapConfig`, zipper `initial`) is only the setup; `model.snap` (`Snap`, zipper `current`) is created from it on init and on every open, and is the only snap state the physics, overlay and view read.

---

## Config

| Field               | Default                    | Description                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | —                          | Unique id; the content element gets `id="tea-cup-drawer-<id>"`                                                                                                                                                                                                                                                                                                         |
| `aria`              | — (required)               | `{ label, describedBy }`: `label` is `Text { value }` (`aria-label`) or `ElementId { id }` (`aria-labelledby`); `describedBy` is an optional element id (`aria-describedby`). See [Accessible name](#accessible-name)                                                                                                                                                  |
| `direction`         | `'bottom'`                 | Edge the drawer is attached to                                                                                                                                                                                                                                                                                                                                         |
| `modality`          | `Modal { lockBody: true }` | `Modal` (overlay, `aria-modal`, focus moved in, body scroll lock when `lockBody`) or `NonModal`                                                                                                                                                                                                                                                                        |
| `dismissible`       | `true`                     | When `false`, only `Close` closes the drawer                                                                                                                                                                                                                                                                                                                           |
| `snap`              | `NoSnap`                   | `NoSnap`, or `Snap { initial, fadeFrom, sequential }`: `initial` is a zipper of `{ _tag: 'Fraction' \| 'Pixel', value }` whose `active` is where it opens (the drawer must span the screen along its axis); `fadeFrom` is the index from which the overlay is opaque (`none` = last, clamped); `sequential` makes flicks move one point instead of jumping to the edge |
| `handleOnly`        | `false`                    | Only the handle (`drawerHandleView`) starts a drag                                                                                                                                                                                                                                                                                                                     |
| `autoFocus`         | `false`                    | Focus the first focusable element on open (instead of the drawer)                                                                                                                                                                                                                                                                                                      |
| `repositionInputs`  | `true`                     | Bottom drawers only: while one of its text fields is focused with the on-screen keyboard open, lift the drawer above the keyboard and cap its height to the visible area, until the keyboard closes                                                                                                                                                                    |
| `closeThreshold`    | `0.25`                     | Fraction of the drawer a slow swipe must cover to close                                                                                                                                                                                                                                                                                                                |
| `velocityThreshold` | `0.4`                      | px/ms above which a swipe is a flick                                                                                                                                                                                                                                                                                                                                   |
| `scrollLockTimeout` | `100`                      | ms after a content scroll during which dragging stays off                                                                                                                                                                                                                                                                                                              |
| `dragThreshold`     | `{ touch: 10, mouse: 2 }`  | px the pointer travels from the press before the gesture is read (its noise until then); it is then decided once for the press                                                                                                                                                                                                                                         |
| `dragAngle`         | `30`                       | Max degrees between that travel and the drawer axis for the gesture to drag the drawer; steeper gestures are left to the content (e.g. scrolling a side drawer's list)                                                                                                                                                                                                 |
| `durationMs`        | `500`                      | Transition duration                                                                                                                                                                                                                                                                                                                                                    |
| `portal`            | `{ _tag: 'Body' }`         | `Body`, `Inline` or `{ _tag: 'Container', get }`                                                                                                                                                                                                                                                                                                                       |
| `ui`                | —                          | `{ content?, overlay?, handle? }` view overrides, also the 4th argument of `defaultConfig`                                                                                                                                                                                                                                                                             |

Mark elements that should never start a drag with `data-drawer-no-drag` (e.g. sliders, carousels).

---

## Customizing the view

`className` / `overlayClassName` on `DrawerComponent` merge into the default views, as does the `className` given to `drawerHandleView`. For full control, give `config.ui.content` / `config.ui.overlay` / `config.ui.handle` a render function and spread `attrs` on your element. Each one also receives that `className`, to merge with its own; `content` gets `direction` and `children`, and `handle` gets `children` (the handle's larger hit area, to render inside it):

```tsx
const config = Drawer.defaultConfig('actions', (m: Message) => m.id, aria, {
  content: ({ attrs, className, children }) => (
    <section {...attrs} className={cn('bg-zinc-900 text-white', className)}>
      {children}
    </section>
  ),
  handle: ({ attrs, className, children }) => (
    <div
      {...attrs}
      className={cn('mx-auto my-3 h-1 w-12 bg-zinc-500', className)}
    >
      {children}
    </div>
  ),
})
```

`defaultContentView`, `defaultOverlayView` and `defaultHandleView` (from `@rinn7e/tea-cup-drawer/component`) are the package's own views, taking the same argument: an override can start from them.

Style per phase with the `data-state` attribute (e.g. `data-[state=Dragging]:shadow-2xl`).

---

## Differences from vaul

The handle (`drawerHandleView`) sits on the drawer's inner edge for every direction: at the top of a bottom drawer (in the flow, as in vaul), at the bottom of a top drawer, and as a vertical bar on the inner side of a left or right drawer (vaul always draws a horizontal handle at the top). It is placed by `drawer.css` from its own `data-drawer-handle` (its drawer's direction), so the content layout doesn't change, and a drawer shown inside another (e.g. a bottom sheet portaled into a side page with `portal: Container`) keeps its own handle.

No keyboard handling: vaul (through Radix Dialog) closes on Escape and traps Tab for the topmost layer of its own stack. Here the owner handles keys with the app's layer stack, which also knows layers that aren't drawers (see [Keyboard](#keyboard)).

Not ported (yet): background scaling (`shouldScaleBackground`), nested drawers, vaul's `fixed`, vaul's iOS touch-move scroll prevention (the body lock and Safari `position: fixed` are ported), `preventScrollRestoration`, and the handle's double-tap / long-press timing. `onDrag` / `onRelease` / `onAnimationEnd` callbacks are replaced by intercepting the drawer's messages.

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
