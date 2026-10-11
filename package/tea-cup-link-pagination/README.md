# `@rinn7e/tea-cup-link-pagination`

A robust, bidirectional infinite-scroll and cursor-based stream pagination engine built for React and The Elm Architecture (TEA), powered by `tea-cup-fp`, `fp-ts`, and `@devexperts/remote-data-ts`.

Designed for complex streaming lists, chat timelines, and bidirectional data feeds with zero layout shift, seamless cache reconciliation, and automatic scroll position memory.

---

## Features

- **Bidirectional Stream Pagination**: Seamlessly load older items (upwards) and newer items (downwards) without UI jumps or layout flickering.
- **Zero Layout Shift Anchor Compensation**: Layout shifts caused by prepending items are counter-measured via `useLayoutEffect` before paint, anchoring the viewport precisely to the user's active reading position.
- **Local-First Scroll Anchor Principle**: Viewport anchor is established immediately upon initial data arrival (cache or API). Subsequent background network responses or live SSE messages are treated strictly as content reconciliations and never overwrite or jump the established reading position.
- **Scroll Memory**: A `ScrollStateMap`, kept by the owner in an fp-ts `IORef`, records the first visible item and its offset per `dataSourceId` while scrolling, and a list shown again goes back to the same item, even after rows above it changed.
- **No Impossible States**: Each end of the list is one `Edge` (`Idle`, `Loading`, `Failed`, `Exhausted`), so a failed page shows a Retry and loads again; the first page is one `Initial`, and the change the view still has to apply is one `PendingChange` carrying its snapshot.
- **Pure The Elm Architecture (TEA)**: Declarative state transitions with pure `init`, `update`, `subscriptions`, and `updateItem` helper.
- **Uniform Parent ItemMsg Interception**: Item-level interactions (e.g. emoji reactions, bookmarks, inline edits) bubble cleanly to the parent component via `{ _tag: 'ItemMsg', item, msg }`.
- **Isolated Component Entrypoint**: Core types, reducer logic, and subscription watchers are exported from `@rinn7e/tea-cup-link-pagination`, while React view components are isolated under `@rinn7e/tea-cup-link-pagination/component`.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-link-pagination
```

### Peer Dependencies

Ensure your project has the required peer dependencies installed:

```bash
pnpm add tea-cup-fp @rinn7e/tea-cup-prelude @rinn7e/tea-cup-intersection-observer fp-ts @devexperts/remote-data-ts react react-dom
```

---

## Quick Start

### 1. Define Link Pagination Configuration

```tsx
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { LinkPaginationMemo } from '@rinn7e/tea-cup-link-pagination/component'
import * as Ord from 'fp-ts/lib/Ord'
import * as N from 'fp-ts/lib/number'
import { Sub } from 'tea-cup-fp'

export const mkLinkPaginationConfig = (
  refs: LinkPagination.Refs,
): LinkPagination.Config<Message, ParentContext, MessageItemMsg> => ({
  logic: {
    refs,
    isReversed: true, // Chat mode: older messages on top, newer on bottom
    ord: Ord.contramap((m: Message) => m.timestamp)(N.Ord),
    uniqueKeyField: (m: Message) => m.id,
    visibleStrategy: { _tag: 'HalfInView' },
    // Each item's own subscriptions (e.g. a drawer it opens); `Sub.none()` if none
    subscriptions: (m: Message) => Sub.none(),
  },
  ui: {
    // Parent state arrives as `parent` (from `Props.parent`, compared with
    // `parentEq`); don't close over the parent model here
    customItemUi: ({ withPrevNextItem, parent }) => (
      <MessageBubble
        message={withPrevNextItem.item}
        isMine={withPrevNextItem.item.userId === parent.currentUserId}
      />
    ),
  },
})
```

`uniqueKeyField` is the item's identity: the list compares items by it
everywhere (there is no separate key `Eq`).

---

## The Model

`Model<Item>` holds the list and the state of its loading:

- **`mode`**: the data source (given at `init`, replaced to switch lists).
  - `overallData`: every loaded item, sorted by `ord`, unique by `uniqueKeyField`.
  - `initial` (`Initial`): the first page: `NotStarted`, `Loading`, `Cached`
    (the cached rows are shown, the API is still deciding), `Failed` or
    `Loaded`. The ends load only once it is `Loaded`, not from cached rows
    about to be replaced.
  - `prev`, `next` (`Edge`): each end: `Idle` (can load more), `Loading`,
    `Failed` (shows "Couldn't load more." with a Retry, or
    `ui.prevFailedCustomView` / `nextFailedCustomView`) or `Exhausted`
    (nothing older / newer).
  - `initialHandler`, `prevHandler`, `nextHandler`, `selectedKey` (the item to
    open at, `null` for the newest page) and `dataSourceId`.
- **`initialScroll`**: the one scroll of an open: `Pending`, `FromCache { key }`
  or `Done`.
- **`pendingChange`** (`PendingChange`): the change to the rows the view still
  has to apply: `None`, `KeepPosition { before }` (rows changed on top; the
  view keeps the position from the snapshot `before`, before paint) or
  `RecordPosition`.

---

## Helpers for the Owner

The owner reads and changes the list through helpers instead of the model's
fields. They compare items by key, so two rows of one item can't both be kept.

- **Reading:** `items`, `findByKey`, `findBy`, `hasKey`, `first` / `last`,
  `isEmpty`, `isInitialLoaded` (the API answered), `isInitialShown` (the first
  page's rows are on screen, cached or loaded), `isAtNewest`.
- **Changing:** `mapItems`, `filterItems`, `filterMapItems`, `updateByKey`,
  `updateWhere`, `removeByKey`, `removeWhere`, `upsertItems` (the fresh item
  replaces the loaded one of the same key; `merge` can combine them) and
  `modifyItems`. Each takes the `ContainerChangeEvent` of its change (where it
  lands); without one, the pending change is kept.
- **Item children:** `childMsg` / `getChildMsg` build and read an item's
  `ChildMsg`; `updateChild` / `updateAllChildren` run an item handler and route
  its Cmd back to the item; `noChange` is the event for an item `update` that
  doesn't move the rows.
- **Scrolling:** `scrollToNewest`, `setSelectedKey`, `restoreSavedScroll`.
- **Data sources:** `mkCacheHandler`, `noopHandler` (an end with nothing to
  load), `initialFromPrev` (the first page loaded as the older end).
- **Messages as functions:** `replaceFuncHandler` does what sending
  `ReplaceFunc` does (it sets the pending change), and `mapFuncHandler` is it
  over each item.

```ts
const linkPagin = LinkPagination.updateByKey(
  logicConfig,
  room.id,
  () => room,
)(model.linkPagin)
```

---

## Keeping the Reading Position

The position is written on every scroll, so it lives outside the model: a
`ScrollStateMap` (`dataSourceId` → the first item at least 15% in view and its
top) in an fp-ts `IORef` the owner keeps. Everything that touches the cell or
the DOM is an `IO`.

```ts
const scrollStateRef = LinkPagination.newScrollStateRef()

LinkPagination.init(
  networkOnline,
  mode,
  LinkPagination.storeScrollState(scrollStateRef), // onContainerScroll
  LinkPagination.mkShouldRestoreScrollState(dataSourceId, scrollStateRef),
)

// A list shown again goes back to the same item, hidden until it's there.
// `resetEdges: true` also reopens its exhausted ends (its data may be stale).
LinkPagination.restoreSavedScroll(logicConfig, scrollStateRef, {
  resetEdges: true,
})(model.linkPagin)
```

---

## Item Subscriptions

`LogicConfig.subscriptions` gives each loaded item its own subscriptions (an overlay or drawer it owns, a timer). `subscriptions(model, logicConfig)` batches them with the load-more triggers and delivers each item's messages to it as `ChildMsg`, handled by `LogicConfig.update` like any other item message. Items keep their subscriptions while the list scrolls.

```ts
LinkPagination.subscriptions(model.linkPagin, logicConfig).map((subMsg) => ({
  _tag: 'LinkPaginMsg',
  subMsg,
}))
```

---

## Example Application & Tests

An interactive showcase application and automated end-to-end test suite are included in this repository:

- **Example App**: `app/example-app` (Runs on `http://localhost:5182`)
- **E2E Playwright Suite**: `app/example-app-e2e`

```bash
# Run example app in development
pnpm --filter "tea-cup-link-pagination-example" dev

# Run comprehensive E2E tests
pnpm --filter "tea-cup-link-pagination-example-e2e" staged
```

---

## License

[MIT License](LICENSE) © 2025 Moremi Vannak
