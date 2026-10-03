# Plan: `@rinn7e/tea-cup-screen-tabs`

> Status: **not scheduled**. Build it when a real screen needs tabs, not
> before. This plan records the design decisions and lessons so far, so the
> implementer does not have to rediscover them.

The screen stack this builds next to lives in `package/tea-cup-screen-stack`
(`ScreenStack.Model<Item>` / `ScreenStack.Msg<Item>`, `ScreenStackComponent` /
`ScreenStackMemo`). Read its `src/` and README first: the tabs package should
mirror its structure and naming.

---

## 1. Goal

Show one screen out of a **fixed set of sibling screens**, with one selected,
like iOS `UITabBarController` or a segmented control: "Inbox | Archive |
Settings". Every tab keeps its state while another one is selected.

---

## 2. Why a separate package (decided)

In TEA, the model of a thing is **Model + Msg**: its data *and* what can be done
to it. Two components are the same thing only if both match (or one is a
superset of the other in both).

| | Model | Msg |
| --- | --- | --- |
| Screen stack | `NonEmptyArray<S>` (last = on show) | Push, Pop, PopTo, Replace |
| Screen tabs | zipper `{ before, selected, after }` | Select(index) |

### The data overlaps…

Any stack fits in the tabs shape with an empty `after`:

```
Stack [A, B, C]  ≅  { before: [A, B], selected: C, after: [] }
```

`toZipper(stack) = { before: init(stack), selected: last(stack), after: [] }`
never loses information, and `fromZipper` (`[...before, selected]`) inverts it
for every zipper whose `after` is empty. So the stack's state space is a strict
subset of the tabs' state space. The fields mean the same in both: `selected`
is on show, and `before` holds screens whose state is kept.

### …but the operations don't

```
stack push(x):  { before: [...before, selected], selected: x, after: [] }
stack pop:      { before: init(before), selected: last(before), after: [] }            // discards
tabs selectPrev:{ before: init(before), selected: last(before), after: [selected, ...after] } // keeps
```

- Tabs cannot **push** (their members are fixed) or **pop** (going back to a
  left tab keeps the one left; pop discards it).
- The stack cannot **select** (jump and keep the screens above).
- Stack operations keep `after = []`; tab operations leave that subset.

Neither's Msg set contains the other's, so **they are two different
components** that happen to store similar data, like `tea-cup-pagination` and
`tea-cup-link-pagination`. Hence a separate package: `tea-cup-screen-tabs`.

For reference, **browser history** is the zipper with every operation (back =
select previous and keep, forward, new page = push clearing `after`). It is a
third, different component, not a base class of the other two.

---

## 3. Data model

### Don't use tea-cup-fp's `ListWithSelection`

`tea-cup-fp` ships `ListWithSelection<T>`, but it does not fit:

- The selection is **optional** (`Maybe<T>`) and the list can be empty, so
  "no tab selected" and "no tabs" would be representable.
- It is a class with private fields: there is no way to update the selected
  item (the equivalent of the stack's `setTop`), and no `Eq` for memoization.
- `isSelected` compares by identity (`===`), which doesn't work with immutable
  updates.
- It uses tea-cup's `Maybe`, while the packages use fp-ts `Option`.

### Use a plain non-empty zipper, and make impossible states impossible

Follow the screen stack's rule: the model must not be able to represent a
state that can't happen. In the stack, that meant keeping the screens in
flight inside the transition and storing each height with its screen (see the
stack README, "Data model"). Apply the same here:

```ts
// A tab and its last measured height, which lives and dies with it
type Entry<Item> = { screen: Item; height: Option<number> }

// Always exactly one tab selected; the order is the tab order
export type Tabs<Item> = {
  before: Entry<Item>[]
  selected: Entry<Item>
  after: Entry<Item>[]
}
```

- **Don't** keep a `heights: Record<…>` next to the tabs: it can hold heights
  for tabs that don't exist. Store them in `Entry`.
- **Don't** store the outgoing tab as an index (`fromIndex: number`) plus a
  `direction` during a switch: the index can be out of range or equal to the
  selection, and the direction can disagree with it. Encode the switch in the
  structure instead, by splitting the zipper around the outgoing tab:
  ```ts
  type Model<Item> =
    | { _tag: 'Idle'; before; selected; after; ... }
    // the outgoing tab is left of the selected one: before ++ [from] ++ between ++ [selected] ++ after
    | { _tag: 'SwitchingForward'; before; from; between; selected; after; phase; ... }
    // the outgoing tab is right of it: before ++ [selected] ++ between ++ [from] ++ after
    | { _tag: 'SwitchingBack'; before; selected; between; from; after; phase; ... }
  ```
  The direction is the tag, the outgoing tab can't coincide with the selected
  one, and every index is derived (`before.length`, ...). `seq` and `config`
  are added to each case (or wrap the union in `{ tabs, seq, config }`).
- If tabs are not animated (section 6), only `Idle` exists, and the model is
  just the zipper plus `config`.
- Index of the selected tab = `before.length` (+ `1 + between.length` while
  switching forward); provide it as a helper, never store it.
- `getModelEq(itemEq)`, the same as the stack's `getModelEq`.
- `defaultModel(config, tabs: NonEmptyArray<Item>, selectedIndex)`: clamp the
  index.

### Msg

```ts
export type Msg<Item> =
  | { _tag: 'Select'; index: number }       // ignored when out of range or already selected
  | { _tag: 'Frame'; seq: number }          // only if animated
  | { _tag: 'TransitionEnd' }
  | { _tag: 'TransitionTimeout'; seq: number }
  | { _tag: 'HeightMeasured'; index: number; height: number }
  | { _tag: 'NoOp' }
```

Maybe add `SelectNext` / `SelectPrevious` for arrow keys and swipes. There is no
add or remove: if a real use case needs dynamic tabs, design it then (it
changes indexes under a running transition).

### Helpers (pure, exported from `index.ts`)

| Helper | |
| --- | --- |
| `getSelected(model)` | The tab on show |
| `setSelected(item)(model)` | Store the updated selected tab |
| `selectedIndex(model)`, `count(model)` | |
| `toArray(model)` | All tabs in order, e.g. for the tab bar |
| `updateWhere(pred, f)(model)` | Update a **non-selected** tab (see routing) |
| `selectHandler(index)` | The `update` branch, to call directly (code convention 8) |

---

## 4. Routing screen messages: different from the stack

The stack drops a message for a screen that is no longer on top, because a
popped screen is **gone**.

Tabs are never gone: a tab that is not selected still exists and keeps its
state. A request started in "Inbox" that answers after the user switched to
"Settings" **must still be applied** to Inbox, or Inbox shows stale data when
the user comes back.

So route by **which tab the message belongs to**, not by "is it selected":

- Usually each tab is a different case of the user's union (`Inbox`,
  `Archive`, `Settings`), so route by tag: find the tab with that `_tag` with
  `updateWhere(t => t._tag === 'Inbox', ...)`.
- If the same case can appear twice (two `Folder` tabs), the user's tab must
  carry an id and the message must carry it too.
- Drop a message only when no tab matches.

Document this prominently in the README; it is the opposite of the stack rule.

---

## 5. View

```tsx
<ScreenTabsMemo
  model={model.tabs}
  dispatch={tabsDispatch}
  renderScreen={(tab, index, parent) => ...}
  itemEq={TabEq}
  parent={...}
  parentEq={...}
/>
```

- Same props pattern as `ScreenStackMemo` / `DrawerMemo`: `renderScreen` only
  uses its arguments and stable values. `parent` + `parentEq` carry
  parent-owned state. Also provide a non-memoized `ScreenTabsComponent` for use
  inside another memo (e.g. a drawer).
- **The package renders the panels, not the tab bar.** Tab bars vary too much
  (bottom bar, segmented control, pills). Export a helper that returns the
  attributes a tab button needs, and let the user render it:
  ```ts
  tabAttrs(model, index, dispatch) => ({
    id, role: 'tab', 'aria-selected', 'aria-controls', tabIndex, onClick, onKeyDown,
  })
  ```
  with `onKeyDown` handling ArrowLeft / ArrowRight / Home / End (WAI-ARIA
  tabs pattern). Panels get `role="tabpanel"` and `aria-labelledby`.
- DOM ids: `<config.id>-tab-<index>` (button), `<config.id>-tabpanel-<index>`
  (panel). The container gets `data-state` / `data-direction` like the stack.

### Open question: keep inactive tabs mounted?

The model keeps each tab's **state**, but DOM state (scroll position, focus,
uncontrolled inputs, video playback) is lost if inactive panels unmount.

- **Unmount** (like the stack): simplest, and only one tab renders.
- **Keep mounted, hidden** (`hidden` + `inert`): scroll positions survive (iOS
  behaviour), but every tab stays rendered.

Possibly a config flag, `keepMounted: boolean`. Decide with the first real
use case.

---

## 6. Animation: optional, decide per use case

Platforms differ: iOS tab bars switch **instantly**, while Material / Android
swipeable tabs **slide**. Start with no animation (`durationMs: 0` path or no
transition at all). Add the slide only if needed.

If animated, reuse the stack's mechanics. Copy them first; extract a shared
module only if the duplication hurts:

- The `SwitchingForward` / `SwitchingBack` cases of section 3, each with a
  `Start` / `Run` phase.
- **Direction from the indexes**: new index > old index → `SwitchingForward`
  (the new tab comes from the end edge), otherwise `SwitchingBack`. Probably a full slide
  (±100%) rather than the stack's -30% parallax: tabs are siblings, not
  layers.
- `Select` while sliding: finish the running transition instantly, then start
  the new one (the stack's `settle`).
- `durationMs: 0` → switch at once.
- Height animation per index, like the stack's `Entry` heights and `containerHeight`.

---

## 7. Composition

- **Tabs of stacks** (iOS: each tab has its own navigation stack):
  `ScreenTabs.Model<ScreenStack.Model<TabScreen>>`. Routing has two levels:
  find the tab, then the stack's top screen inside it.
- **In a drawer**: `Drawer.Model<ScreenTabs.Model<Tab>>`, the same recipe as
  the stack (the tabs are the drawer's `internal`: reset on open, kept while
  sliding away). Use `getInternal` / `setInternal`.
- The drawer and the stack must **not** depend on tabs. Composition happens in
  the consumer only.

---

## 8. Lessons from tea-cup-drawer and the screen stack (apply them)

Read `package/tea-cup-drawer/doc/porting-vaul.md` and the stack's `src/` first.

- **State machines as data**: every phase is a tag, and every interruption is
  an explicit `update` branch.
- **Facts in messages**: read the DOM in the view or event handler, pass the
  result in the Msg, and keep `update` pure.
- **`seq` guard**: frame and timeout messages carry the seq they were
  scheduled with and are ignored once another transition started.
- **CSS transitions need a start frame**: render the start positions, wait for
  a paint, then switch. Copy `afterNextPaint` from `effect.ts`: a double rAF
  raced against a 100ms timeout with a forced reflow, because hidden tabs
  throttle rAF.
- **`transitionend` is unreliable**: always schedule a `TransitionTimeout`
  (`durationMs + 50`) too. Only accept `transitionend` from the panel itself
  (`e.target === e.currentTarget && e.propertyName === 'transform'`).
- **Height**: measure in the view (`useLayoutEffect` for the first measurement,
  so it is known before the transition starts, plus `ResizeObserver` for
  changes), never in a `Sub`. Subscriptions are created before React mounts
  the new panel. Report only changes, and return the **same model** when a
  height is unchanged, or observe → dispatch → render loops.
- **Explicit container height while idle** too, so content changes (data
  arriving) animate instead of jumping.
- **Opaque screen backgrounds**: sliding panels overlap. The example wizard
  initially had transparent steps, which showed through each other.
- **Outgoing panel `inert` + `aria-hidden`.** Move focus to the new panel only
  if focus was inside the component or on `<body>`; never steal it from the
  rest of the page.
- **Memoization**: render functions receive everything as arguments
  (`itemEq` / `parent` / `parentEq`, `getPropsEq` with `EqAlways` for
  functions).
- **Testing pitfalls**: the Claude browser pane is often hidden, which freezes
  CSS transitions and `ResizeObserver` (the model looks right while the pixels
  don't move). Trust the Playwright run, which is not throttled. Headless
  Chromium uses overlay scrollbars, so scrollbar and layout-shift bugs only
  show in a real browser.
- **Dogfood with realistic content**: a tab with its own TEA model and an
  async request (the stack's example used a 1s simulated folder load). That is
  what exposes routing bugs.

---

## 9. Package checklist

Copy the scaffolding from the stack package (the most recent):

- [ ] `package/tea-cup-screen-tabs`: `package.json` (`@rinn7e/tea-cup-screen-tabs`,
      `1.0.0`, MIT, exports `.` and `./component`, the same peer deps),
      `tsup.config.ts`, `tsconfig.json`, `eslint.config.js`, prettier files,
      `.npmignore`, `.gitignore`, `vitest.config.ts`, `LICENSE`.
- [ ] MIT header on every `src/` and `tests/` file.
- [ ] `src/`: `type.ts`, `update.ts`, `util.ts`, `effect.ts` (if animated),
      `view.tsx`, `component.tsx`, `index.ts` (**never** export `component`).
- [ ] Unit tests: select (in range, out of range, already selected), state
      kept across selections, `setSelected` / `updateWhere`, direction from
      indexes, interruptions, stale `seq`, `HeightMeasured` returning the same
      model, `durationMs: 0`, props Eq.
- [ ] `app/example-app` on **port 5185** (5173 form, 5180 router, 5181
      pagination, 5182 link-pagination, 5183 drawer, 5184 screen stack).
      Demos:
      1. Tabs with their own TEA models and an async load; switch away before
         it answers, and it must still land in its tab.
      2. Keyboard navigation of the tab bar (arrows, Home / End).
      3. Optional: tabs of stacks, or tabs in a drawer.
- [ ] `app/example-app-e2e`: selection and `aria-selected`; state kept per
      tab; late messages land in the right inactive tab; keyboard navigation;
      focus; height; rapid switching ends consistent. Run twice with
      `--retries=0 --repeat-each=2`.
- [ ] `README.md`: concept, the routing rule (section 4), the tab bar helper,
      composition recipes.
- [ ] Root: `README.md` package list, `CHANGELOG.md` (Unreleased → Added),
      `scripts/publish-all.sh` (`PACKAGES` + the "All N packages" count).
- [ ] `pnpm install --offline` at the root; `pnpm run staged` in the package and
      the example apps.

## 10. Repo conventions

- Follow `docs/code-convention.md`: explicit `if / else` decision trees,
  `Config` inside `Model` with `ConfigEq = EqAlways`, `updateAndCmd` for
  intercepting child messages, call handlers directly instead of `msgCmd`.
- Naming: type params `Item`, `Parent`; props `itemEq`, `parent`, `parentEq`;
  `renderScreen`.
- Commits: short lowercase subjects (`add tea-cup-screen-tabs`), **no
  `Co-Authored-By` or other AI attribution**, and don't push until the owner
  asks.
- **This repo is public**: before pushing, scan the diff and the commit
  messages for private project names, local paths (`/Users/...`), real emails
  (only `@example.com`) and secrets. Never commit working notes such as a
  `handover.md`.

## 11. Open questions for the owner

1. Animate at all? If so, a full slide or a cross-fade?
2. Keep inactive tabs mounted (`keepMounted`) or unmount them?
3. Ship a default tab bar view, or only `tabAttrs`?
4. Swipe between tabs (touch drag, like Material)? That brings drag physics,
   possibly from the drawer's `util.ts`.
5. Dynamic tabs (add / remove / reorder)?
