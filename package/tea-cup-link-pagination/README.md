# `@rinn7e/tea-cup-link-pagination`

A robust, bidirectional infinite-scroll and cursor-based stream pagination engine built for React and The Elm Architecture (TEA), powered by `tea-cup-fp`, `fp-ts`, and `@devexperts/remote-data-ts`.

Designed for complex streaming lists, chat timelines, and bidirectional data feeds with zero layout shift, seamless cache reconciliation, and automatic scroll position memory.

---

## Features

- **Bidirectional Stream Pagination**: Seamlessly load older items (upwards) and newer items (downwards) without UI jumps or layout flickering.
- **Zero Layout Shift Anchor Compensation**: Layout shifts caused by prepending items are counter-measured via `useLayoutEffect` before paint, anchoring the viewport precisely to the user's active reading position.
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
): LinkPagination.Config<Message, MessageItemMsg> => ({
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
    customItemUi: ({ withPrevNextA, dispatch }) => (
      <MessageBubble
        message={withPrevNextA.a}
        onToggleReaction={(emoji) =>
          dispatch({ _tag: 'ToggleReaction', emoji })
        }
      />
    ),
  },
})
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
