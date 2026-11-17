# `@rinn7e/tea-cup-link-pagination`

A robust, bidirectional infinite-scroll and cursor-based stream pagination engine built for React and The Elm Architecture (TEA), powered by `tea-cup-fp`, `fp-ts`, and `@devexperts/remote-data-ts`.

Designed for complex streaming lists, chat timelines, and bidirectional data feeds with zero layout shift, seamless cache reconciliation, and automatic scroll position memory.

---

## Features

- **Bidirectional Stream Pagination**: Seamlessly load older items (upwards) and newer items (downwards) without UI jumps or layout flickering.
- **Rendered Through a Scroll Container**: The list renders through [`@rinn7e/tea-cup-scroll-container`](../tea-cup-scroll-container), the one writer of the scroll position. It keeps the row the reader reads still while older items are prepended or rows above it grow, decides every scroll in TEA and applies it before paint, and draws only the rows near the view (with `chatConfig`).
- **Local-First Scroll Anchor Principle**: Viewport anchor is established immediately upon initial data arrival (cache or API). Subsequent background network responses or live SSE messages are treated strictly as content reconciliations and never overwrite or jump the established reading position.
- **Scroll Memory**: A `ScrollStateMap`, kept by the owner in an fp-ts `IORef`, records the row at the top of the view and its offset per `dataSourceId` (reported by the scroll container), and a list shown again goes back to the same item, even after rows above it changed.
- **No Impossible States**: Each end of the list is one `Edge` (`Idle`, `Loading`, `Failed`, `Exhausted`), so a failed page shows a Retry and loads again; the first page is one `Initial`, and who holds the scroll position is the `Model` of the scroll container.
- **Pure The Elm Architecture (TEA)**: Declarative state transitions with pure `init`, `update`, `subscriptions`, and `updateItem` helper.
- **Uniform Parent ItemMsg Interception**: Item-level interactions (e.g. emoji reactions, bookmarks, inline edits) bubble cleanly to the parent component via `{ _tag: 'ChildMsg', childId, subMsg }`.
- **Isolated Component Entrypoint**: Core types, reducer logic, and subscription watchers are exported from `@rinn7e/tea-cup-link-pagination`, while React view components are isolated under `@rinn7e/tea-cup-link-pagination/component`.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-link-pagination
```

### Peer Dependencies

Ensure your project has the required peer dependencies installed:

```bash
pnpm add tea-cup-fp react-tea-cup @rinn7e/tea-cup-prelude @rinn7e/tea-cup-scroll-container @tanstack/virtual-core fp-ts @devexperts/remote-data-ts react react-dom
```

---

## Quick Start

### 1. Define Link Pagination Configuration

```tsx
import * as LinkPagination from '@rinn7e/tea-cup-link-pagination'
import { LinkPaginationMemo } from '@rinn7e/tea-cup-link-pagination/component'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
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
    // How the scroll container keeps the position: `chatConfig` for a
    // reversed list, `feedConfig` for one with its newest items on top
    scrollContainer: ScrollContainer.chatConfig,
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

- **`mode`**: the data source (given at `init`; to switch lists, build a new
  one with `init`).
  - `overallData`: every loaded item, sorted by `ord`, unique by `uniqueKeyField`.
  - `initial` (`Initial`): the first page: `NotStarted`, `Loading`, `Cached`
    (the cached rows are shown, the API is still deciding), `Failed` or
    `Loaded`. The ends load only once it is `Loaded`, not from cached rows
    about to be replaced. A refresh of a loaded list stays `Loaded`.
  - `prev`, `next` (`Edge`): each end: `Idle` (can load more), `Loading`,
    `Failed` (shows "Couldn't load more." with a Retry, or
    `ui.prevFailedCustomView` / `nextFailedCustomView`) or `Exhausted`
    (nothing older / newer).
  - `initialHandler`, `prevHandler`, `nextHandler`, `selectedKey` (the item to
    open at, `null` for the newest page) and `dataSourceId`. An open at a
    target reads the cache around it: `initialHandler`'s cache returns the
    cached page around `selectedKey`, or nothing when it isn't cached. Cached
    rows without the target would show where the open won't stay, and load
    the page next to them.
- **`initialScroll`**: the one scroll of an open: `Pending`, `FromCache { key }`
  or `Done`. A first load that fails with nothing to show leaves it `Pending`;
  a reader who scrolls the cached rows (wheel, touch or key: `ReaderScrolled`)
  ends it, so the API's answer doesn't pull them back.
- **`scrollContainer`** (`ScrollContainer.Model`): the state of the scroll
  container the list renders through: who holds the position, the last
  decision for the view to apply, and whether the list is hidden while a
  scroll puts it in place (`ScrollContainer.isPlacing`, which shows
  `ui.loadingView`). Its messages arrive as `ScrollContainerMsg`. The open
  scrolls to `selectedKey` through it, its row landing at the offset of
  `mode.selectedAnchor` when that is its anchor (a stored reading position).
- **`flash`**: the row of the last `ScrollToKey` (a search result), highlighted
  with the `bg-fade-out` class for `FLASH_MS`, until `FlashDone`. The class
  is styled by the owner (a background that fades out).
- **`readerScrolling`**, **`heldPages`**: older and newer pages that arrive
  while the reader moves the list wait in `heldPages` and go in once it comes
  to rest (rows added above need the position moved, which iOS does not allow
  while a finger or a fling moves the list); the end shows its loader
  meanwhile.

---

## Rendering Through the Scroll Container

`LinkPaginationMemo` renders the rows with the
`ScrollContainer` of `@rinn7e/tea-cup-scroll-container`, one per data source
(keyed by `dataSourceId`), on `refs.containerRef`:

- **Loading more:** the older and newer ends are the header and footer of the
  container. When one comes into view (its `EdgeShown`), the list loads that
  end while it is `Idle`; a failed end loads again only by its Retry.
- **Scrolling:** `ScrollToNewest` (with an optional `behavior`) and
  `ScrollToKey` are scrolls of the container, which holds the row while the
  rows around it grow. `LogicConfig.scrollToKeyOffset` lands a `ScrollToKey`
  row under a bar floating over the list.
- **Each item is one row:** `ui.itemPrefixUi` draws a view above an item
  inside its row (e.g. the date of the first message of a day), and
  `ui.topItemOverlayUi` a view over the list, given the item at the top and
  whether the reader scrolls (e.g. that date, floating). There are no groups
  around rows: an anchor is a row.
- **Go to latest:** `ui.scrollToLatestCustomUi` shows unless the newest item is
  loaded and its row is shown (`isLatestButtonVisible`).

---

## Helpers for the Owner

The owner reads and changes the list through helpers instead of the model's
fields. They compare items by key, so two rows of one item can't both be kept.

- **Reading:** `items`, `findByKey`, `findBy`, `hasKey`, `first` / `last`,
  `isEmpty`, `isInitialLoaded` (the API answered), `isInitialShown` (the first
  page's rows are on screen, cached or loaded), `isInitialFailed` (the first
  page failed, with nothing to show), `isAtNewest`.
- **Changing:** `mapItems`, `filterItems`, `filterMapItems`, `updateByKey`,
  `updateWhere`, `removeByKey`, `removeWhere`, `upsertItems` (the fresh item
  replaces the loaded one of the same key; `merge` can combine them) and
  `modifyItems`. The scroll container keeps the reading position through any
  change of the rows, so a change says nothing of where it lands.
- **Item children:** `childMsg` / `getChildMsg` build and read an item's
  `ChildMsg`; `updateChild` / `updateAllChildren` run an item handler and route
  its Cmd back to the item.
- **Scrolling:** `scrollToNewest` (smooth unless a `behavior` is given),
  `setSelectedKey`, `restoreSavedScroll`.
- **Data sources:** `mkCacheHandler`, `noopHandler` (an end with nothing to
  load), `initialFromPrev` (the first page loaded as the older end).
- **Messages as functions:** `replaceFuncHandler` does what sending
  `ReplaceFunc` does, and `mapFuncHandler` is it over each item.

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
`ScrollStateMap` (`dataSourceId` -> the row at the top of the view and its
top) in an fp-ts `IORef` the owner keeps. The scroll container reports that
row (its `onAnchor`) on every scroll and once a scroll of ours put the list in
place; `storeScrollState(ref)` keeps it. Everything that touches the cell is
an `IO`.

```ts
const scrollStateRef = LinkPagination.newScrollStateRef()

LinkPagination.init(
  networkOnline,
  mode,
  LinkPagination.storeScrollState(scrollStateRef), // onAnchor
)

// A list shown again goes back to the same item, hidden until it is there.
// `resetEdges: true` also reopens its exhausted ends (its data may be stale).
LinkPagination.restoreSavedScroll(scrollStateRef, {
  resetEdges: true,
})(model.linkPagin)
```

A list whose model the owner kept and draws again needs nothing: the scroll
container puts its settled position back by itself.

---

## Item Subscriptions

`LogicConfig.subscriptions` gives each loaded item its own subscriptions (an overlay or drawer it owns, a timer). `subscriptions(model, logicConfig)` batches them and delivers each item's messages to it as `ChildMsg`, handled by `LogicConfig.update` like any other item message. Items keep their subscriptions while the list scrolls.

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
