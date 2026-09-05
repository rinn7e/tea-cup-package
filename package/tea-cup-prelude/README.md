# `@rinn7e/tea-cup-prelude`

Core prelude, interoperability utilities, and runtime helpers for React applications built with The Elm Architecture (TEA), powered by `tea-cup-fp`, `react-tea-cup`, `fp-ts`, and `@devexperts/remote-data-ts`.

---

## Features

- **TEA & fp-ts Interoperability Bridges**: Seamlessly convert between `fp-ts` (`TaskEither`, `Task`, `IO`) and `tea-cup-fp` (`Task`, `Cmd`) with helper combinators (`attemptTE`, `performIO`, `performIO_`, `taskFromTE`, `taskToTE`).
- **Command Chaining & Tuple Reducers**: High-order combinators (`updateAndCmd`, `batchCmd`, `extraCmd`) to compose TEA state updates and asynchronous commands cleanly.
- **Redux DevTools Integration**: Out-of-the-box DevTools integration (`devTools()`) for time-travel debugging in `react-tea-cup` applications.
- **Data Structure Utilities**: Immutable array (`ArrayExtra`) and map (`MapExtra`) manipulation utilities.
- **Tailwind & Class Utilities**: Type-safe class name composer (`cn`) combining `clsx` and `tailwind-merge`.
- **Runtime Validation Helpers**: `io-ts` runtime schema validation and decode utilities.

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-prelude
```

### Peer Dependencies

```bash
pnpm add tea-cup-fp fp-ts @devexperts/remote-data-ts react react-tea-cup clsx tailwind-merge
```

---

## Quick Start & Examples

### 1. Invoking `TaskEither` Endpoints via `attemptTE`

Execute `fp-ts` `TaskEither` API calls inside TEA `Cmd` without boilerplate:

```ts
import { attemptTE } from '@rinn7e/tea-cup-prelude'
import { Cmd, Result } from 'tea-cup-fp'

export const fetchArticlesCmd = (): Cmd<Msg> =>
  attemptTE(
    Api.getArticles({ limit: 10 }),
    (result: Result<HttpError, ArticlesResponse>): Msg => ({
      _tag: 'GetArticlesResponse',
      result,
    }),
  )
```

---

### 2. Composing State and Commands with `updateAndCmd`

Chain dependent update operations and automatically batch emitted commands:

```ts
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'PaginationMsg': {
      const [pagination, paginationCmd] = Pagination.update(config)(
        msg.subMsg,
        model.pagination,
      )

      return pipe(
        [{ ...model, pagination }, paginationCmd.map(toPaginationMsg)],
        updateAndCmd((m) => {
          if (msg.subMsg._tag === 'ItemMsg') {
            return handleItemMsg(msg.subMsg.item, msg.subMsg.msg)(m)
          }
          return [m, Cmd.none()]
        }),
      )
    }
  }
}
```

---

### 3. Redux DevTools Integration in `main.tsx`

Connect `react-tea-cup` to browser Redux DevTools:

```tsx
import { devTools } from '@rinn7e/tea-cup-prelude'
import { Program } from 'react-tea-cup'

import { init, update, view } from './app'

export const App = () => (
  <Program
    init={init}
    update={update}
    view={view}
    subscriptions={() => Sub.none()}
    {...devTools<Model, Msg>().getProgramProps()}
  />
)
```

---

### 4. Immutable Array Manipulation (`ArrayExtra`)

```ts
import { ArrayExtra } from '@rinn7e/tea-cup-prelude'

// Update item at index immutably if it exists
const updatedList = ArrayExtra.modifyAtIfExist(index, (item) => ({
  ...item,
  isFavorite: !item.isFavorite,
}))(items)
```

---

### 5. Class Name Helper (`cn`)

```ts
import { cn } from '@rinn7e/tea-cup-prelude'

const className = cn(
  'px-4 py-2 rounded-xl text-sm font-semibold',
  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700',
  customClassName,
)
```

---

## API Reference

### TEA Helpers (`./tea`)

| Function       | Signature                                    | Description                                                                                        |
| :------------- | :------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| `attemptTE`    | `(te, toMsg) => Cmd<Msg>`                    | Executes an `fp-ts` `TaskEither` as a `tea-cup-fp` `Task` wrapped in a `Cmd`.                      |
| `performIO`    | `(io, toMsg) => Cmd<Msg>`                    | Executes an `fp-ts` `IO` side-effect as a `Cmd`.                                                   |
| `performIO_`   | `(io) => Cmd<{ _tag: 'NoOp' }>`              | Executes an `fp-ts` `IO` and discards the result.                                                  |
| `taskFromTE`   | `(te) => Task<E, R>`                         | Converts `TaskEither<E, R>` to `tea-cup-fp` `Task<E, R>`.                                          |
| `taskToTE`     | `(task) => TaskEither<E, R>`                 | Converts `tea-cup-fp` `Task<E, R>` to `TaskEither<E, R>`.                                          |
| `updateAndCmd` | `(func) => ([model, cmd]) => [model, cmd]`   | Maps model through an update function and batches the resulting command with the existing command. |
| `batchCmd`     | `(newCmd) => ([model, cmd]) => [model, cmd]` | Appends a command to a `[model, cmd]` tuple.                                                       |
| `resultToRd`   | `(result) => RemoteData<E, A>`               | Converts a `tea-cup-fp` `Result` to `@devexperts/remote-data-ts` `RemoteData`.                     |
| `delayCmd`     | `(ms, msg) => Cmd<Msg>`                      | Emits a message after a specified delay in milliseconds.                                           |
| `cmdSucceed`   | `(fn) => Cmd<{ _tag: 'NoOp' }>`              | Runs a synchronous effect and returns a `NoOp` command.                                            |

---

## License

[MIT License](LICENSE) © 2026 Moremi Vannak
