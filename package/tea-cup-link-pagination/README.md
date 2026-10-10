# `@rinn7e/tea-cup-link-pagination`

A robust, bidirectional infinite-scroll and cursor-based stream pagination engine built for React and The Elm Architecture (TEA), powered by `tea-cup-fp`, `fp-ts`, and `@devexperts/remote-data-ts`.

Designed for complex streaming lists, chat timelines, and bidirectional data feeds with zero layout shift, seamless cache reconciliation, and automatic scroll position memory.

---

## Features

- **Bidirectional Stream Pagination**: Seamlessly load older items (upwards) and newer items (downwards) without UI jumps or layout flickering.
- **Zero Layout Shift Anchor Compensation**: The row the user is reading stays put when items are prepended, inserted or removed, and when rows above the view grow late (images), in every browser including Safari / iOS. See [Scroll Anchoring](#scroll-anchoring).
- **Local-First Scroll Anchor Principle**: Viewport anchor is established immediately upon initial data arrival (cache or API). Subsequent background network responses or live SSE messages are treated strictly as content reconciliations and never overwrite or jump the established reading position.
- **Automatic Internal Scroll Memory**: Built-in `ScrollStateMap` automatically records top visible item ID and offset per `dataSourceId` during scrolling and restores the exact reading offset when switching channels without external callback boilerplate.
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
import * as Eq from 'fp-ts/lib/Eq'
import * as Ord from 'fp-ts/lib/Ord'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

export const mkLinkPaginationConfig = (
  refs: LinkPagination.Refs,
  mode: LinkPagination.Mode<Message>,
): LinkPagination.Config<Message, ParentContext, MessageItemMsg> => ({
  logic: {
    refs,
    mode,
    isReversed: true, // Chat mode: older messages on top, newer on bottom
    eqWithKey: Eq.struct({ id: S.Eq }),
    ord: Ord.contramap((m: Message) => m.timestamp)(N.Ord),
    uniqueKeyField: (m: Message) => m.id,
    visibleStrategy: { _tag: 'HalfInView' },
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

---

## Scroll Anchoring

The list keeps the reading position itself, like CSS scroll anchoring, and sets `overflow-anchor: none` on its scroll container so every browser runs the same code (WebKit has no `overflow-anchor`).

- **Every commit**: before React changes the DOM, the scroll container (`ScrollPort`) reads the first visible rows and their offsets; right after, before paint, it puts the first row that is still there back at its offset. Positions are measured, never derived from an earlier scroll height, so growth without a scroll event (an image, a font) cannot skew it. This is done in the view because react-tea-cup runs Cmds after the frame is painted.
- **Late resizes**: a `ResizeObserver` over the rows (`.custom-ui-wrapper`) and the load-more ends moves `scrollTop` by the growth of rows wholly above the view.

The pure parts are exported from `scroll-anchor.ts` (`pickAnchorCandidates`, `restoreScrollTop`, `resizeAdjustment`). The package's Tailwind classes must be scanned by the app (e.g. `@source '<path to the package>/src/**/*.{ts,tsx}'`); if `overflow-anchor: none` is missing, the browser's own anchoring handles late resizes and the list does not correct them a second time.

`containerChangeEvent` (`ElementModifyOnTop`, ...) no longer drives the scroll correction; it is still consumed (reset to `NoChange`) after each change.

---

## Loading States

Each load is a sum type in `Mode`; the loaded items themselves live in `overallData`.

```ts
type Load =
  | { _tag: 'Idle' }
  | { _tag: 'Loading' }
  | { _tag: 'Loaded' }
  | { _tag: 'Failed'; error: HttpErrorString }

type Edge = Load | { _tag: 'Exhausted' } // nothing more at this end
```

- `mode.initial: Load`: the first page (cache, then API). A failed cache read carries on to the API. If the API fails while cached items are on show, they stay (`Loaded`); with nothing on show, it is `Failed` and the view shows the error with a retry (`GetInitialData`).
- `mode.prev` / `mode.next: Edge`: older and newer pages. `GetMorePrevData` / `GetMoreNextData` start a load from `Idle`, `Loaded` or `Failed`, and are ignored while `Loading` or once `Exhausted`. A failed page shows a retry button instead of the in-view trigger, so a failing endpoint is not called again every time the trigger scrolls into view.
- `canLoadEdge(edge)` says whether an end may load; `reopenEdge(edge)` lets an `Exhausted` end load again (e.g. when re-entering a list whose history may have grown).
- The failure views can be replaced through `ui.initialFailedView`, `ui.prevFailedView` and `ui.nextFailedView`, which receive `{ parent, error, retry }`.

---

## Example Application & Tests

An interactive showcase application and automated end-to-end test suite are included in this repository:

- **Example App**: `app/example-app` (Runs on `http://localhost:5182`)
- **E2E Playwright Suite**: `app/example-app-e2e`
- **Unit Tests**: `tests/` (Vitest, `pnpm test`, included in `pnpm staged`)

```bash
# Run example app in development
pnpm --filter "tea-cup-link-pagination-example" dev

# Run comprehensive E2E tests
pnpm --filter "tea-cup-link-pagination-example-e2e" staged
```

---

## License

[MIT License](LICENSE) © 2025 Moremi Vannak
