# `@rinn7e/tea-cup-scroll-container`

A scroll container for React and The Elm Architecture, powered by `tea-cup-fp`, `fp-ts` and `@tanstack/virtual-core`: a virtualized list that keeps the reading position while rows load above it, grow late or the viewport changes height. Every scroll decision (who holds the position, what the view must do to it) is made by a pure `update` and kept in your model; the view is the one writer of the scroll offset and applies each decision once, before the browser paints.

It is the scroll engine of a chat (newest at the end) or a feed (newest at the start). `@rinn7e/tea-cup-link-pagination` renders through it.

---

## Features

- **Who holds the position is data**: `Model.follow` is `AtEnd`, `Free { anchor }` (the reader reads here), `Navigating { target, behavior, until }` (a scroll of ours in flight) or `Restoring { anchor }` (a stored position being put back). Each message carries its cause, so `update` decides with the facts, not with timers.
- **Reading position kept by row, not by offset**: an `Anchor` is a row `key` and its top from the top edge of the viewport. Rows added above the view, or growing above it (late images), do not move the row the reader reads (`onPrepend`, `onItemResize`).
- **Scrolls that land**: a scroll to a row is aimed again while the rows around it load and grow, until it settles, the reader takes over, or `MAX_NAVIGATE_MS` passes. A scroll to the end that a browser stopped on the way (WebKit stops a smooth scroll when the page resizes) goes on to the end.
- **The reader always wins**: a wheel, a touch move, a navigation key outside a text field or a press on the scrollbar sends `ReaderScrolled`, which drops the target of a scroll of ours without writing the offset (a write would stop an iOS momentum scroll).
- **Viewport resizes**: `onViewportResize` keeps the bottom line (a chat above an on-screen keyboard or an editor that grows), the top line, or the anchor row.
- **Placed out of sight**: a scroll of ours can hide the list (`hide`, `opacity-0`) until a frame painted it where it lands, so a list opened at a row or put back never flashes at the top first. `isPlacing` tells the owner to show its loader meanwhile.
- **Virtualized**: with `virtualize: On`, only the rows near the view are drawn, through the `Virtualizer` of `@tanstack/virtual-core`. Rows not measured yet are laid out at the median of the rows measured so far. See [Virtualization](#virtualization).
- **Edges for loading more**: `EdgeShown` tells the owner that the header (`Start`) or the footer (`End`) came into view, or is still in view after the rows changed, so it loads the next page there.
- **An overlay that follows the scroll**: `overlay` draws a view over the list (a floating date, a "go to latest" button) from what the view shows (`OverlayView`), without drawing the rows again on every scroll.
- **Pure, tested logic**: the handlers (`scrollToHandler`, `restoreHandler`, `itemsChangedHandler`, ...) and the helpers in `util.ts` are pure functions with a Vitest suite; the view is tested in jsdom.
- **Isolated React entrypoint**: types, `init`, `update` and the helpers come from `@rinn7e/tea-cup-scroll-container`; the view (`ScrollContainer`, `rowBounds`) from `@rinn7e/tea-cup-scroll-container/component`.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-scroll-container
```

Peer dependencies:

```bash
pnpm add @rinn7e/tea-cup-prelude @tanstack/virtual-core tea-cup-fp fp-ts react react-dom
```

The view uses Tailwind classes for its mechanics (`overflow-y-auto`, `[overflow-anchor:none]`, `opacity-0`, ...). With Tailwind v4, let it scan the package:

```css
@source '../node_modules/@rinn7e/tea-cup-scroll-container/lib';
```

---

## Quick Start

### 1. Model

```ts
import * as SC from '@rinn7e/tea-cup-scroll-container'

export type Model = {
  messages: Message[]
  scroll: SC.Model
}

export type Msg =
  | { _tag: 'ScrollMsg'; subMsg: SC.Msg }
  | { _tag: 'Sent'; message: Message }

// A chat: newest at the end. The config is static, given to `update` and the
// view, never kept in the model.
export const scrollConfig = SC.chatConfig

export const init = (): Model => ({
  messages: [],
  // Free until the first scroll of ours says where the list is
  scroll: SC.init(),
})
```

### 2. Update

Every message of the container goes through `SC.update(config)`, with the same `config` as the view: the view runs `update` itself on what it saw (to apply the decision before paint) and dispatches the same message, so the program model catches up with the same decision. `EdgeShown` changes nothing in the container: intercept it to load more.

```ts
case 'ScrollMsg': {
  const subMsg = msg.subMsg
  const [scroll, cmd] = SC.update(scrollConfig)(subMsg, model.scroll)
  return pipe(
    [
      { ...model, scroll },
      cmd.map((m): Msg => ({ _tag: 'ScrollMsg', subMsg: m })),
    ],
    updateAndCmd((m) =>
      subMsg._tag === 'EdgeShown' && subMsg.edge === 'Start'
        ? loadOlderHandler(m)
        : [m, Cmd.none()],
    ),
  )
}

case 'Sent':
  // Rows added at the end never move the position: the owner scrolls to
  // them when the reader adds one
  return [
    {
      ...model,
      messages: [...model.messages, msg.message],
      scroll: SC.scrollToHandler(
        { _tag: 'End' },
        'smooth',
        Date.now(),
      )(model.scroll),
    },
    Cmd.none(),
  ]
```

### 3. View

```tsx
import { ScrollContainer } from '@rinn7e/tea-cup-scroll-container/component'

;<div className='relative flex h-full flex-col'>
  {SC.isPlacing(model.scroll) ? <Loader /> : null}
  <ScrollContainer
    model={model.scroll}
    config={scrollConfig}
    count={model.messages.length}
    getKey={(i) => model.messages[i].id}
    renderRow={(i) => <MessageRow message={model.messages[i]} />}
    header={<OlderMessagesLoader />}
    footer={null}
    containerRef={refs.containerRef}
    className='px-4'
    onAnchor={(anchor) => storePosition(chatId, anchor)}
    watchEdges={{ start: true, end: false }}
    dispatch={(subMsg) => dispatch({ _tag: 'ScrollMsg', subMsg })}
  />
</div>
```

The scroll element is `flex-1 min-h-0`: put it in a flex column of a fixed height, `relative` when it has an `overlay` (drawn next to the scroll element). `ScrollContainer` is not memoized: `renderRow`, `header` and `footer` are render functions and elements of the owner, with no sound `Eq`.

| Prop           | Description                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`        | The `SC.Model` of this list                                                                                                                                                                        |
| `config`       | The `SC.Config` given to `update` too                                                                                                                                                              |
| `count`        | How many rows                                                                                                                                                                                      |
| `getKey`       | The stable key of the row at an index (an anchor and a scroll to a row name rows by key)                                                                                                           |
| `renderRow`    | The content of the row at an index                                                                                                                                                                 |
| `header`       | A view above the first row (e.g. a loader of older rows). Not a row: an anchor never lands on it                                                                                                   |
| `footer`       | A view below the last row                                                                                                                                                                          |
| `keyOffset`    | Optional: added to the offset of a `Key` target when a scroll of ours lands (e.g. the height of a search bar floating over the top of the list)                                                    |
| `containerRef` | The scroll element, shared with the owner (it reads the rows from the DOM). Only told about the element: an owner may share it between lists                                                       |
| `className`    | Merged into the classes of the scroll element                                                                                                                                                      |
| `onAnchor`     | Optional: the row at the top of the view, on every scroll and once a placement ends, never while the list is placed. For the owner bookkeeping (a stored reading position), never through `update` |
| `overlay`      | Optional: a view over the list, given the `OverlayView`. Not drawn while the list is placed, nor before the engine has its scroll element                                                          |
| `shownMargin`  | Optional: how far past the edge of the view the first or last row may reach and still count as shown (`OverlayView.startShown`, `endShown`)                                                        |
| `watchEdges`   | Optional: `{ start, end }`, the ends `EdgeShown` is sent for (none when not given)                                                                                                                 |
| `dispatch`     | Sends the messages of the container to the owner                                                                                                                                                   |

---

## The Model

```ts
type Model = {
  follow: Follow
  geometry: Geometry | null
  pendingAdjust: PendingAdjust | null
  placing: number | null
}
```

- **`follow`** (`Follow`): who the position belongs to.
  - `AtEnd`: at the end. A smaller viewport keeps the end in view (by the policies of the config). Rows added at the end move nothing, and the position then belongs to the reader (`Free`).
  - `Free { anchor }`: the reader reads here; `anchor` is the row at the top when the position last settled (`null` before it first settles).
  - `Navigating { target, behavior, until }`: a scroll of ours to `target` (`Start`, `End`, or `Key { key, offset, onlyIfHidden }`) is in flight; nothing else moves the position until it settles, the reader takes over, or `until` (a time in ms, `MAX_NAVIGATE_MS` after the scroll started) passes. A scroll to a row keeps holding it while the rows around it still grow, until `until`.
  - `Restoring { anchor }`: a stored position is being put back, like an instant scroll to the row of the anchor.
- **`geometry`**: `scrollTop`, `scrollHeight` and `clientHeight` as last seen by `update` (when a scroll settled or the viewport resized), not on every scroll.
- **`pendingAdjust`**: the last decision for the view, numbered (`{ seq, command }`). The view applies each decision once; a `Command` is `ScrollToStart`, `ScrollToEnd`, `ScrollToKey`, `ScrollBy { delta }` or `Cancel` (drop the target of the scroll in flight, leaving the offset where it is).
- **`placing`**: the `seq` of the decision that hid the list, or `null`. Only the `Placed` of that decision shows the list again, so a newer hiding decision keeps it hidden until it lands too.

Every type has its `Eq` (`ModelEq`, `FollowEq`, `AnchorEq`, `TargetEq`, `ConfigEq`, ...).

---

## Messages

Each message carries its cause.

| Message           | Sent by                 | Meaning                                                                                                                                    |
| ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ItemsChanged`    | The view                | The keys changed: how many rows were `prepended`, `appended` and `removed`, and the `anchor` at the top once they changed                  |
| `ViewportResized` | The view                | The viewport changed height (`prev`, `next`)                                                                                               |
| `ReaderScrolled`  | The view                | The reader moved the view (`input`: `wheel`, `touch`, `key` or `pointer`)                                                                  |
| `ScrollSettled`   | The view                | The scroll came to rest: its `geometry`, `anchor` and whether it is `atEnd`                                                                |
| `ScrollTo`        | The owner (or the view) | A scroll of ours to a `target`, with its `behavior` (`instant` or `smooth`), `now`, and `hide`                                             |
| `Restore`         | The owner (or the view) | Put a stored `anchor` back, instantly, hidden until it is there when `hide`                                                                |
| `Placed`          | The view                | The hiding decision `seq` is applied and a frame painted the list there                                                                    |
| `EdgeShown`       | The view                | The header (`Start`) or footer (`End`) came into view, or is still in view after the rows changed. For the owner; the container ignores it |
| `NoOp`            | n/a                     | Nothing                                                                                                                                    |

A row changing height is no message: the engine asks `adjustOnItemResize` in its resize callback, before paint (a message would only arrive after the browser painted the jump).

---

## Config

`Config` holds the policies the owner chooses. It is static, like the rest of an owner config: given to `update` and the view, not kept in the model.

| Field              | Values                                                      | Description                                                                                                                             |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `onPrepend`        | `'keepAnchor'`, `'none'`                                    | Rows added above the view: keep the row the reader reads still, or let them push it down                                                |
| `onViewportResize` | `'keepEnd'`, `'keepStart'`, `'keepAnchor'`                  | The viewport changed height: keep its bottom line (at the end: stay at the end), its top line, or the anchor row                        |
| `onItemResize`     | `'keepAnchor'`, `'none'`                                    | A row above the view changed height: keep the row of the reader still, or let it move                                                   |
| `virtualize`       | `{ _tag: 'Off' }`, `{ _tag: 'On', overscan, estimateSize }` | Draw only the rows near the view (with `overscan` rows around it, and `estimateSize` px for a row before any is measured), or every row |

Two presets:

```ts
// A chat: newest at the end, virtualized (a reader scrolled back many pages
// has hundreds of rows loaded)
export const chatConfig: Config = {
  onPrepend: 'keepAnchor',
  onViewportResize: 'keepEnd',
  onItemResize: 'keepAnchor',
  virtualize: { _tag: 'On', overscan: 5, estimateSize: 400 },
}

// A feed: newest at the start, the row of the reader kept still whatever is
// added at either end
export const feedConfig: Config = {
  onPrepend: 'keepAnchor',
  onViewportResize: 'keepStart',
  onItemResize: 'keepAnchor',
  virtualize: { _tag: 'Off' },
}
```

Spread a preset to change one policy: `{ ...SC.chatConfig, virtualize: { _tag: 'Off' } }`.

---

## Wiring the Owner

### Scrolling: `ScrollTo`

Ask for a scroll of ours with `scrollToHandler(target, behavior, now, hide?)` in your `update` (or by sending `ScrollTo`):

```ts
// The newest row of a chat, after the reader sent a message
SC.scrollToHandler({ _tag: 'End' }, 'smooth', Date.now())(model.scroll)

// A search result: its top under the search bar (`keyOffset`), only if it is
// not in view already
SC.scrollToHandler(
  { _tag: 'Key', key: result.id, offset: 0, onlyIfHidden: true },
  'smooth',
  Date.now(),
)(model.scroll)

// Opening a list at a row: hidden until it is there
SC.scrollToHandler(
  { _tag: 'Key', key: selectedId, offset: 0, onlyIfHidden: false },
  'instant',
  Date.now(),
  true,
)(model.scroll)
```

Rows added at the end never move the position, even at the end: the end of the rows loaded is not always the newest one (a page loads below the reader), so the owner scrolls to a row the reader adds itself.

### Putting a position back: `onAnchor` and `Restore`

`onAnchor` reports the row at the top of the view on every scroll and once a placement ends, never while the list is placed. Store it per list, outside the model (it is called on every scroll, which must not render the list again):

```ts
const positions = new Map<string, SC.Anchor>()
const storePosition = (listId: string, anchor: SC.Anchor) => {
  positions.set(listId, anchor)
}
```

When a list whose model was dropped is shown again with a fresh model, put the stored row back with `restoreHandler(anchor, hide?)` (or by sending `Restore`):

```ts
const stored = positions.get(listId)
const scroll = stored
  ? SC.restoreHandler(stored, true)(SC.init())
  : SC.scrollToHandler({ _tag: 'End' }, 'instant', Date.now(), true)(SC.init())
```

The anchor offset is measured from the top edge of the viewport, so a restore lands the row there, not under `keyOffset`. The container holds the row while the rows around it grow, and with `hide` keeps the list hidden until a frame painted it there.

A view drawn again on a model that settled before (the owner kept the model, and the list is mounted again: another layout, a parent that changed) puts the position back by itself, hidden: the end of a list that keeps its end (`keepEnd`) with an instant `ScrollTo`, the anchor of a `Free` list with a `Restore`. A model that never settled has no position to put back.

Give each list (another data source) its own model and its own React `key` on `ScrollContainer`: a decision is numbered within its model (`pendingAdjust.seq`).

### Loading more: `EdgeShown`

List the ends you load at in `watchEdges`. When the header or the footer comes into view, or is still in view after the rows changed (a short page loads the next one), the view sends `EdgeShown { edge }`. Never while the list is placed: the view is not where it lands yet. Load the page there when that end is idle, and stop watching an end that has nothing more (`watchEdges={{ start: hasOlder, end: hasNewer }}`). The header and the footer are measured by the view, and rows added under the header keep the row of the reader.

### The reader taking over: `ReaderScrolled`

The view sends `ReaderScrolled` on the input of the reader, once per gesture, also when the position already belongs to the reader, so the owner can react (e.g. end a provisional scroll of its own, or hold pages while the reader moves the list).

### An overlay: `overlay` and `OverlayView`

```tsx
overlay={(view) => (
  <>
    <FloatingDate messageId={view.topKey} visible={view.isScrolling} />
    <LatestButton visible={!view.endShown} />
  </>
)}
shownMargin={48}
```

`OverlayView` is `{ topKey, isScrolling, startShown, endShown }`: the row at the top of the view, whether the list scrolls, and whether its first and last rows are shown (in the view, reaching at most `shownMargin` px past its edge at their end, `isEndRowShown`). The overlay follows the scroll by itself and draws again only when its `OverlayView` changed.

### Where a row is: `rowBounds`

`rowBounds(container, key)` (from `/component`) gives the `{ top, bottom }` of a row from the top of the view of `container`: from its DOM when it is drawn, from the layout of the engine otherwise (estimated for a row never drawn), `null` for a row the list does not have.

---

## Virtualization

The view keeps a `Virtualizer` of `@tanstack/virtual-core` in a ref. `update` decides what it does (`pendingAdjust`) and the view applies each decision once, before paint; nothing else writes the scroll offset. The browser scroll anchoring is turned off on the scroll element (`overflow-anchor: none`): the engine keeps the position itself, on every browser, and the browser would move it a second time.

- **`virtualize: On { overscan, estimateSize }`**: only the rows near the view are drawn, with `overscan` rows around them. A row not measured yet is laid out at the median height of the rows measured so far (`rowEstimate`; the median, so a few very tall rows do not pull every estimate up), `estimateSize` before any, and keeps that estimate until it is measured. Up to 30 rows added at once (a page, a new message) are measured right away, drawn out of sight for one commit, so a row does not change height later under the reader.
- **`virtualize: Off`**: every row stays in the DOM (find in page, DOM reads of the owner); only their positions come from the engine.

Each row is wrapped in a `div` with `data-index` and the class `flow-root`, so a margin of its content stays inside the measured row. A row out of view has no DOM in a virtualized list: read its position with `rowBounds`, and watch it with a subscription that waits for its element (e.g. `@rinn7e/tea-cup-intersection-observer`).

---

## Helpers

From `@rinn7e/tea-cup-scroll-container`:

- **Model:** `init(follow?)`, `isPlacing`, `isNavigating`, `heldKey` (the row a scroll of ours keeps still), `MAX_NAVIGATE_MS`.
- **Handlers:** `update(config)`, and the functions it runs, to call from your own `update`: `scrollToHandler`, `restoreHandler`, `placedHandler`, `readerScrolledHandler`, `scrollSettledHandler`, `viewportResizedHandler`, `itemsChangedHandler`, and `adjustOnItemResize` (asked by the engine).
- **Utilities:** `itemsChange(prev, next)` (how the keys changed), `isEndRowShown`, `boundedOffset` (an offset held inside the row), `rowEstimate`, `isEditable` (whether a key event goes to a text field).
- **Presets:** `chatConfig`, `feedConfig`.

---

## Development

```bash
pnpm --filter @rinn7e/tea-cup-scroll-container staged    # format, check, lint, unit tests
pnpm --filter @rinn7e/tea-cup-scroll-container test      # unit tests (Vitest, the view in jsdom)
```

The state machine is tested per cause in `tests/` (`scroll-to`, `restore`, `items-changed`, `viewport-resized`, ...). The engine itself cannot run there (it measures the DOM): `tests/view.test.tsx` runs the view in jsdom with every row drawn.

---

## License

MIT. See [LICENSE](LICENSE).
