# `@rinn7e/tea-cup-pagination`

A modular, type-safe, zero-flicker functional pagination library built for React and The Elm Architecture powered by `tea-cup-fp`, `fp-ts`, and `@devexperts/remote-data-ts`.

---

## Features

- **The Elm Architecture (TEA) Design**: State transitions and asynchronous API calls are pure, predictable, and fully decoupled from presentation.
- **RemoteData State Handling**: Backed by `@devexperts/remote-data-ts` (`RemoteInitial`, `RemotePending`, `RemoteFailure`, `RemoteSuccess`) to cleanly represent loading and error states.
- **Race Condition & Stale Response Discarding**: Automatically tracks target page IDs across requests to discard outdated responses when users rapidly navigate between pages.
- **In-Place Item Action Support**: Dispatches nested `ItemMsg` directly to parent reducers, enabling optimistic in-place modifications (e.g., favoriting, inline editing) without losing pagination state.
- **Isolated Component Entrypoint**: Core types and reducers are exported from `@rinn7e/tea-cup-pagination`, while React view components are cleanly isolated under `@rinn7e/tea-cup-pagination/component`.
- **Configurable Smooth Scrolling**: Optional `scrollContainerId` to smoothly scroll custom container elements or the global window to the top on page changes.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-pagination
```

### Peer Dependencies

Ensure your project has the required peer dependencies installed:

```bash
pnpm add tea-cup-fp @rinn7e/tea-cup-prelude fp-ts @devexperts/remote-data-ts react react-dom
```

---

## Quick Start

### 1. Define Pagination Configuration

Create a `Pagination.Config` specifying how to fetch data and how to render the items and pagination bar:

```tsx
import * as RD from '@devexperts/remote-data-ts'
import type * as Pagination from '@rinn7e/tea-cup-pagination'
import * as TE from 'fp-ts/lib/TaskEither'
import React from 'react'

export const mkPaginationConfig = (
  model: AppModel,
  dispatch: (msg: AppMsg) => void,
): Pagination.Config<Product, ProductMsg, string> => ({
  limit: 6,
  scrollContainerId: 'product-scroll-container',

  // Pure TaskEither data fetcher
  handler: (offset: number, limit: number) =>
    Api.getProducts({ offset, limit, category: model.selectedCategory }),

  // Render items based on RemoteData lifecycle
  renderItems: (itemsRd, itemDispatch) => {
    switch (itemsRd._tag) {
      case 'RemoteInitial':
      case 'RemotePending':
        return <LoadingSkeleton count={6} />
      case 'RemoteFailure':
        return (
          <ErrorView
            message={itemsRd.error}
            onRetry={() => dispatch({ _tag: 'RetryFetch' })}
          />
        )
      case 'RemoteSuccess':
        return (
          <div className='grid grid-cols-3 gap-6'>
            {itemsRd.value.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                dispatch={(productMsg) => itemDispatch(product, productMsg)}
              />
            ))}
          </div>
        )
    }
  },

  // Render pagination navigation bar
  renderPagination: (currentPage, pageAmount, onPageChange) => (
    <PaginationBar
      currentPage={currentPage}
      pageAmount={pageAmount}
      onPageChange={onPageChange}
    />
  ),
})
```

---

### 2. Initialize Model & Batch Commands

Initialize the pagination state inside your parent TEA `init`:

```ts
import * as Pagination from '@rinn7e/tea-cup-pagination'
import { Cmd } from 'tea-cup-fp'

export const init = (): [AppModel, Cmd<AppMsg>] => {
  const baseModel: AppModel = {
    selectedCategory: 'all',
    pagination: {
      items: RD.initial,
      page: 1,
      pageAmount: 0,
    },
  }

  const config = mkPaginationConfig(baseModel, () => {})
  const [pagination, paginationCmd] = Pagination.init(config, 1)

  const model: AppModel = {
    ...baseModel,
    pagination,
  }

  return [
    model,
    paginationCmd.map((subMsg): AppMsg => ({ _tag: 'PaginationMsg', subMsg })),
  ]
}
```

---

### 3. Handle Pagination Messages in Update

Delegate sub-messages to `Pagination.update(config)` and handle item-level messages:

```ts
import * as Pagination from '@rinn7e/tea-cup-pagination'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

export const update = (
  msg: AppMsg,
  model: AppModel,
): [AppModel, Cmd<AppMsg>] => {
  switch (msg._tag) {
    case 'PaginationMsg': {
      const config = mkPaginationConfig(model, () => {})
      const [pagination, paginationCmd] = Pagination.update(config)(
        msg.subMsg,
        model.pagination,
      )

      return pipe(
        [
          { ...model, pagination },
          paginationCmd.map(
            (subMsg): AppMsg => ({ _tag: 'PaginationMsg', subMsg }),
          ),
        ] satisfies [AppModel, Cmd<AppMsg>],
        updateAndCmd((m) => {
          if (msg.subMsg._tag === 'ItemMsg') {
            return handleProductItemMsg(msg.subMsg.item, msg.subMsg.msg)(m)
          }
          return [m, Cmd.none()]
        }),
      )
    }
  }
}
```

---

### 4. Render with `<PaginationMemo />`

Import `<PaginationMemo />` from `@rinn7e/tea-cup-pagination/component`:

```tsx
import { PaginationMemo } from '@rinn7e/tea-cup-pagination/component'
import * as S from 'fp-ts/lib/string'
import React from 'react'

export const AppView: React.FC<Props> = ({ model, dispatch }) => {
  const paginationConfig = mkPaginationConfig(model, dispatch)

  return (
    <div id='product-scroll-container'>
      <PaginationMemo
        model={model.pagination}
        config={paginationConfig}
        dispatch={(subMsg) => dispatch({ _tag: 'PaginationMsg', subMsg })}
        itemEq={ProductEq}
        errEq={S.Eq}
      />
    </div>
  )
}
```

---

## API Reference

### Core Types (`@rinn7e/tea-cup-pagination`)

#### `Config<Item, ItemMsg, Err>`

Configuration object for the pagination engine:

| Property            | Type                                                                                                 | Description                                                    |
| :------------------ | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `limit`             | `number`                                                                                             | Maximum number of items per page.                              |
| `handler`           | `(offset: number, limit: number) => TE.TaskEither<Err, { items: Item[]; totalCount: number }>`       | TaskEither endpoint handler to fetch items.                    |
| `renderItems`       | `(items: RD.RemoteData<Err, Item[]>, itemDispatch: (item: Item, msg: ItemMsg) => void) => ReactNode` | Item list renderer for the current RemoteData state.           |
| `renderPagination`  | `(currentPage: number, pageAmount: number, onPageChange: (page: number) => void) => ReactNode`       | Navigation bar renderer.                                       |
| `scrollContainerId` | `string?`                                                                                            | Optional container element ID to scroll to top on page change. |

#### `Model<Item, Err>`

```ts
export type Model<Item, Err> = {
  items: RD.RemoteData<Err, Item[]>
  page: number
  pageAmount: number
}
```

#### `Msg<Item, ItemMsg, Err>`

```ts
export type Msg<Item, ItemMsg, Err> =
  | { _tag: 'ChangePage'; page: number }
  | {
      _tag: 'FetchResponse'
      page: number
      result: RD.RemoteData<Err, { items: Item[]; totalCount: number }>
    }
  | { _tag: 'ItemMsg'; item: Item; msg: ItemMsg }
  | { _tag: 'NoOp' }
```

---

### Functions (`@rinn7e/tea-cup-pagination`)

- **`init<Item, ItemMsg, Err>(config, page = 1): [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>]`**  
  Initializes model state and dispatches the initial data fetch command for the requested page.

- **`update<Item, ItemMsg, Err>(config)(msg, model): [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>]`**  
  Reduces pagination messages and emits commands (data fetch, smooth scroll).

- **`mkModelEq(itemEq, errEq): Eq<Model<Item, Err>>`**  
  Constructs an `fp-ts` `Eq` instance for deep model equality checking.

- **`mkPropsEq(itemEq, errEq): Eq<Props<Item, ItemMsg, Err>>`**  
  Constructs an `fp-ts` `Eq` instance for React memoization.

---

### React Component (`@rinn7e/tea-cup-pagination/component`)

- **`<PaginationMemo />`**: Heavily optimized, memoized React component using `mkPropsEq` to eliminate redundant renders.
- **`<PaginationComponent />`**: Unmemoized direct view component.

---

## Example Application & Tests

An interactive showcase application and automated end-to-end test suite are included in this repository:

- **Example App**: `app/example-app` (Runs on `http://localhost:5181`)
- **E2E Playwright Suite**: `app/example-app-e2e` (17 automated test suites)

```bash
# Run example app in development
pnpm --filter "tea-cup-pagination-example" dev

# Run comprehensive E2E tests
pnpm --filter "tea-cup-pagination-example-e2e" staged
```

---

## License

[MIT License](LICENSE) © 2025 Moremi Vannak
