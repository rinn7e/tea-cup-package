# Porting vaul to The Elm Architecture

Notes from rebuilding [vaul](https://github.com/emilkowalski/vaul) (v1.1.2) as
`@rinn7e/tea-cup-drawer`: what vaul is made of, how each piece maps to TEA,
what worked well, what hurt, and the trade-offs that are still open.

---

## 1. What vaul actually is

vaul's core is a single `Root` component of about 1150 lines plus a few hooks
(`use-snap-points`, `use-position-fixed`, `use-prevent-scroll`, ...). Its
state is spread across:

- **7 `useState`**: `isOpen`, `isDragging`, `hasBeenOpened`, `justReleased`, ...
- **24 `useRef`**: `pointerStart`, `dragStartTime`, `openTime`,
  `lastTimeDragPrevented`, `isAllowedToDrag`, `shouldAnimate`, ...
- **15 `useEffect`**, several `setTimeout(500)` calls tied to the transition
  duration.
- **~26 direct `element.style.*` writes**. During a drag, vaul sets
  `transform` / `opacity` on the DOM itself so React never re-renders.
- **Radix Dialog** underneath for the portal, focus trap, Escape, aria and
  the "presence" logic that keeps the content mounted until the close
  animation (a CSS keyframe animation keyed on `data-state`) ends.

The gesture maths itself (velocity, thresholds, rubber-banding, snap point
selection, "should this gesture drag or scroll?") is a small, mostly pure core
buried inside event handlers that read and write refs.

---

## 2. How the pieces were mapped

| vaul                                                                                          | tea-cup-drawer                                                                                                         |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `isOpen` + `isDragging` + `hasBeenOpened` + `justReleased` + `shouldAnimate` + Radix presence | One sum type, `AnimateState<A>`: `Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut` |
| `pointerStart`, `dragStartTime`, `isAllowedToDrag` refs                                       | `Press` (captured on pointer down) inside `Gesture.Pressed` / `Dragging`                                               |
| `onPress` / `onDrag` / `onRelease`                                                            | `PointerDown` / `PointerMove` / `PointerUp` / `PointerCancel` messages                                                 |
| `onRelease` decision, `dampenValue`, `useSnapPoints.onRelease`                                | Pure functions in `util.ts`: `dragDistance`, `decideRelease`, `overlayOpacityAt`                                       |
| `shouldDrag` (DOM walk + timing refs)                                                         | DOM facts measured at pointer down (`isNoDragTarget`, `hasScrolledAncestor`), timing decided by the pure `decideDrag`  |
| `element.style.transform = ...` during drags                                                  | Rendered from the model: `--drawer-translate` CSS variable from `translateCss(model)`                                  |
| `setTimeout(TRANSITIONS.DURATION)`                                                            | `transitionend` → `TransitionEnd`, with `AnimationTimeout` (`delayCmd`) as a fallback                                  |
| Window listeners (pointer, keyboard)                                                          | `Sub`: document pointer events only while a gesture is active, keyboard only while open                                |
| Body `position: fixed` (Safari), scroll lock, focus restore                                   | `Cmd`s in `effect.ts` (`lockBodyScrollCmd`, `restoreFocusCmd`, ...)                                                    |
| `open` / `onOpenChange` / `defaultOpen` (controlled + uncontrolled)                           | Always controlled: `Open { internal }`, `Close`, `Dismiss` messages; parents compare `isOpen` before/after `update`    |
| Radix Dialog                                                                                  | Plain `div role="dialog"` + overlay, Tab trap and Escape in `subscriptions`                                            |

---

## 3. What went well

### The animation state as an AST

This was the single biggest win. In vaul, "where is the drawer right now?"
is answered by combining several booleans, refs and Radix's internal presence
state, and some combinations are impossible but representable (dragging while
closed, "just released" while opening). vaul needs guards like "don't allow a
drag within 500ms of opening" (`openTime`) to stay out of those corners.

With `AnimateState`, every phase is one tag, and every interruption is an
explicit branch in `update`:

- close while `AnimateIn` → `AnimateOut` (reverse from the current position)
- open while `AnimateOut` → `AnimateIn` with the new payload
- close while `Mounting` → straight to `Invisible`, nothing to animate
- press while `AnimateIn` → ignored (replaces vaul's 500ms `openTime` guard)

It is also inspectable: the example app prints the tag of every drawer, the
Playwright suite asserts on `data-state`, and the tea-cup dev tools show each
transition.

### The payload lives in the state

Every non-`Invisible` state carries `internal: A`. A typical TEA parent clears
its own "selected item" the moment it closes a drawer; with vaul (or any
React-state drawer) the content then renders empty while sliding away, and
Radix's presence only hides that because it keeps the old React tree mounted.
Here the drawer keeps the payload until `AnimateOut` finishes, so the
problem cannot happen. This one would be awkward to retrofit into vaul.

### Pure, testable gesture logic

Pulling the maths out of event handlers made it testable without a DOM:
55 Vitest tests cover drag distances, rubber-banding, snap clamping,
release decisions (slow drag, flick, strong flick, sequential snapping),
`shouldDrag` rules, overlay opacity and every state transition. vaul's own
suite is Playwright-only, and several of its snap point tests are commented
out.

### "Facts in messages" as a rule

The rule that made the port tractable: **read the DOM at event time, put the
result in the message, decide in `update`.** `PointerDown` carries a `Press`
with the measured size, viewport, starting offset and whether the target is a
`select` / `[data-drawer-no-drag]` / inside scrolled content. `update` never
touches the DOM, so it stays pure and replayable.

### Stale timers are a non-issue

Each animation bumps `model.seq`; frame and timeout messages carry the `seq`
they were scheduled with and are ignored if it no longer matches. vaul has a
handful of `setTimeout`s that can fire after the state they were meant for
has changed; here that class of bug is structurally gone.

### Controlled-only is simpler

vaul supports both controlled and uncontrolled usage (`useControllableState`),
plus `onOpenChange`, `onClose`, `onAnimationEnd`, `onDrag`, `onRelease`. In
TEA the model is the single source of truth, so all of that collapses into
messages the parent can intercept with `updateAndCmd`.

---

## 4. What was hard, or worse than vaul

### Every pointer move goes through the whole TEA loop

vaul writes `transform` straight to the element during a drag and never
re-renders. Here each `pointermove` dispatches a message, updates the model
and re-renders from the root down to the drawer. With memoized content this
has been smooth in desktop Chromium, but **it has not been measured on a
low-end phone with heavy drawer content yet**, and this is the most likely
place for jank.

Mitigations if it shows up: coalesce moves to one per animation frame, make
sure drawer content is memoized, or (the hybrid option) keep only the phase
in the model and write the live offset to a CSS variable from a `Cmd`. The
hybrid gives up "the model is the whole truth" during a drag, so it should
only happen if profiling demands it.

### Subscriptions are rebuilt on every update

`subscriptions(model)` is re-evaluated after each message, so the document
`pointermove` listener is removed and re-added on every move of a drag.
It works and is cheap in practice, but it is a pattern vaul does not pay for.

### CSS transitions need a frame the model doesn't naturally have

For a transition to run, the element must first be rendered at its start
position and have its style computed. That forced an extra state
(`Mounting`) and an "after next paint" `Cmd`. The first version waited for
two `requestAnimationFrame`s, which browsers throttle to about one per second
in hidden tabs: the drawer sat in `Mounting` for a second. The fix races the
frames against a 100ms timeout that forces a reflow
(`getBoundingClientRect`) before switching to `AnimateIn`.

vaul avoids this by using CSS keyframe animations for open/close. The
trade-off is deliberate: transitions reverse smoothly from wherever the
drawer is when interrupted, keyframes jump.

### `transitionend` cannot be trusted alone

It doesn't fire when nothing actually moved (e.g. a "spring back" from
0px), when the tab is hidden, or when the element is removed. Every animation
therefore also schedules `AnimationTimeout` (`durationMs + 50`).

### The DOM can disagree with the model

Measuring the drawer's starting offset from its computed `transform` broke
when the model had already moved on (the timeout marked it `Visible`) but the
browser had not run the transition (hidden tab): drags started 129px off.
The fix: when the drawer is at rest, take the offset from the model (the
active snap point); measure the DOM only when it is genuinely mid-flight
(`Settling`). In general, prefer the model as the source of truth and use DOM
measurements only for what the model cannot know.

### Some effects live outside the model

The body scroll lock needs a reference count across drawers, and focus
restore needs the element that was focused before opening. Both are
module-level state in `effect.ts`, reached only through `Cmd`s. It is
contained, but it is impure state TEA cannot see, and the scroll lock can
interact badly with page layout (see below).

### Memoization needed explicit data channels

The first version had `children: (internal) => ReactNode` closing over the
parent's state, which has no sound `Eq`, so it couldn't be memoized. The fix
came from link-pagination's `Item` / `Parent` split: `children` now receives
both `internal` (owned by the drawer, compared with `itemEq`) and `parent`
(owned by the parent, compared with `parentEq`), so `DrawerMemo` is sound as
long as `children` only uses its arguments. The same audit found the same
staleness bug in tea-cup-pagination, which got a `parent` channel too.

### Escape needs a layer stack, not "who has focus"

Escape first went to "the drawer holding the focus". That broke as soon as the
content re-rendered away the focused element (switching a menu page): focus
fell back to `<body>` and Escape stopped working. It now follows Radix's
approach: open drawers form a stack, and Escape / the Tab trap belong to the
topmost one, wherever the focus is. The stack is module state in `effect.ts`,
updated by the same `Cmd`s that save and restore focus.

### `onOpenChange` needs a little ceremony

The drawer closes itself on swipes, overlay taps and Escape. A parent that
needs to react compares `Drawer.isOpen(before.animate)` with
`Drawer.isOpen(after.animate)` inside `updateAndCmd`. It is explicit and pure,
but more code than passing a callback.

---

## 5. Trade-offs at a glance

|                       | vaul                                  | tea-cup-drawer                                                        |
| --------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Drag performance      | Direct DOM writes, no re-render       | Re-render per move (unmeasured on low-end phones)                     |
| Where state lives     | Hooks, refs, Radix internals          | One model, one `AnimateState`                                         |
| Interruptions         | Guards and timeouts                   | Explicit transitions, `seq` for stale messages                        |
| Content while closing | Radix keeps the old tree mounted      | Payload kept in the state                                             |
| Open/close animation  | CSS keyframes (jump when interrupted) | CSS transitions (reverse smoothly)                                    |
| Testing               | Playwright only                       | Unit tests on pure logic + Playwright                                 |
| API                   | Controlled or uncontrolled, callbacks | Controlled only, messages                                             |
| Focus / a11y          | Radix Dialog (battle-tested)          | Own minimal version: layer stack for Escape / Tab trap, focus restore |
| Dependencies          | Radix Dialog                          | None beyond tea-cup / fp-ts                                           |

---

## 6. Things learned along the way

- **Port the tests' intent, not your assumptions.** One e2e test expected
  "drag an open drawer upward → it springs back". vaul actually treats that
  gesture as a content scroll and never starts a drag (`shouldDrag` returns
  false when pulling an open drawer further open). The drawer was right and
  the test was wrong. Reading vaul's source before writing expectations
  saves this kind of detour.
- **Headless browsers hide scrollbar bugs.** Headless Chromium uses overlay
  scrollbars, so the layout shift caused by the scroll lock
  (`overflow: hidden` on `body` removes the page scrollbar) only showed in a
  real browser. The example app now uses an app-shell layout: the page scrolls
  inside its own container, so the body never has a scrollbar to lose.
  `html { overflow-y: scroll }` looks like a fix but stops `body`'s overflow
  from propagating to the viewport, which breaks the lock.
- **Hidden tabs are a real environment.** rAF throttling and frozen
  transitions surfaced two bugs (slow mount, wrong drag origin) that would
  also hit users who open a drawer from a background tab.
- **vaul's structure helped.** Its source maps cleanly: handlers become
  messages, refs become model fields, `set(el, ...)` calls become view
  output, `useEffect`s become `Cmd`s and `Sub`s.

---

## 7. Not ported (yet)

- Background scaling (`shouldScaleBackground`, `setBackgroundColorOnScale`)
- Nested drawers (`onNestedDrag`, `onNestedOpenChange`)
- Keyboard-aware repositioning (`repositionInputs`, `fixed`,
  `visualViewport` handling)
- vaul's iOS touch-move scroll prevention (`usePreventScroll`); the body lock
  and Safari `position: fixed` are ported
- `preventScrollRestoration`
- The handle's double-tap / long-press timing
- The 500ms drag lock after reaching the last snap point

---

## 8. Possible next steps

- Profile drags on a low-end Android phone with realistic content; decide
  between frame coalescing and the CSS-variable hybrid only with numbers.
- `SetSnapPoints` message so a parent can start the drawer at its measured
  content height (e.g. a composer sheet that grows with its text).
- Optional scrollbar-width compensation in the scroll lock, for apps whose
  page scrolls on `body`.
- Port `repositionInputs` if a consumer needs it.
