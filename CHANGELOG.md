# Changelog

All notable changes to **tea-cup-package** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **`@rinn7e/tea-cup-screen-stack`**: New package. A screen stack with animated switches (`Push` / `Pop` / `PopTo` / `Replace`) whose screens are a user-defined union, each able to carry its own TEA model. Every phase is an explicit `Transition` (`Idle`, `Pushing`, `Popping`, in phase `Start` / `Run`) that holds the screens in flight until they have slid away, so the model can't represent impossible states; interruptions finish the running transition first. The container animates between the measured heights of the screens. Works inside a drawer (the whole stack is the drawer's payload) or on its own. `ScreenStackMemo` renders with `itemEq` / `parent` / `parentEq`. Includes a Vitest suite, an example app (drawer menu and standalone wizard) and a Playwright e2e suite.
- **`@rinn7e/tea-cup-drawer`**: New package. A drawer (bottom sheet / side panel) ported from [vaul](https://github.com/emilkowalski/vaul) to The Elm Architecture: swipe to dismiss, snap points, four directions, modal and non-modal modes, scroll-aware dragging, body scroll lock and focus handling. `DrawerMemo` renders the content from two channels, `internal` (owned by the drawer) and `parent` (owned by the parent), and `getInternal` / `setInternal` let a TEA component live in the payload. Every animation phase is an explicit `AnimateState` (`Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut`) that keeps the opening payload until the drawer is fully closed. Includes a Vitest suite, a kitchen-sink example app and a Playwright e2e suite.

### Changed

- **`@rinn7e/tea-cup-link-pagination`** (breaking): Renamed the one-letter names to match `tea-cup-pagination`. Type parameters `A` → `Item`, `B` → `Parent`, `amsg` → `ItemMsg`, `pmsg` → `ParentMsg`. Props `aEq` → `itemEq`, `b` → `parent`, `bEq` → `parentEq`, `mkPmsg` → `mkParentMsg`, `dispatchP` → `dispatchParent`. `CustomUiParam` fields `b` → `parent`, `withPrevNextA` → `withPrevNextItem`, `selectedA` → `selectedItem`, `allA` → `allItems`; `WithPrevAndNext` fields `a` / `prevA` / `nextA` → `item` / `prevItem` / `nextItem`; `LogicConfig.update` takes `parent` (was `parentSt`); `getSelectedA` → `getSelectedItem`, `isAEqual` → `isItemEqual`.
- **`@rinn7e/tea-cup-pagination`** (breaking): Item messages carried a copy of the item taken when they were sent, so handlers (and replies such as API responses) could act on stale data, and every parent had to find and replace items in `model.items` itself. `Config` now takes `uniqueKeyField: (item: Item) => string`, `ItemMsg` carries `key` instead of `item` (`renderItems`' `itemDispatch(item, msg)` is unchanged and derives the key), and the new helpers `getItem(config, key)` and `modifyItem(config, key, f)` read and update the current item. The parent still applies item updates. Adds a Vitest suite.
- **`@rinn7e/tea-cup-pagination`** (breaking): `PaginationMemo` couldn't reflect parent state. `config` is compared with `EqAlways`, so render functions closing over the parent model rendered stale (e.g. highlighting the product open in a modal) until the pagination model itself changed. `Props` now take `parent` and `parentEq`, and `renderItems` / `renderPagination` receive `parent` as their last argument. `Config`, `Props`, `init` and `update` gain a `Parent` type parameter, and `mkPropsEq` takes `parentEq`.

---

## [1.0.3] - 2026-09-26

### Fixed

- **`@rinn7e/tea-cup-prelude`**:
  - `NullableEq` / `UndefinableEq` now treat only `null` / `undefined` as missing. Previously any falsy value (`0`, `''`, `false`) was treated as missing, so e.g. `NullableEq(N.Eq).equals(0, null)` returned `true` and `UndefinableEq(B.Eq).equals(false, undefined)` returned `true`.
  - Falsy values (`0`, `''`, `false`) are no longer treated as missing by `unsafeFromNullable` (no longer throws on `0`), `rdConvertNullSuccessToInitial` and `CacheData.fromNullable` (no longer turn a falsy success into `initial`), and `SortedUniqueArray.lookup` (no longer returns `none` for a falsy element).
  - `words` follows haskell semantics: leading/trailing white space no longer yields empty words (`words(' a ')` → `['a']`, `words('')` → `[]`).
  - `errorToString` always returns a string (previously `undefined` for `undefined` / function inputs).
  - `throttle` resolves superseded calls with the trailing call's result; previously their promises never resolved.
  - `isInView` with a `container` compares viewport coordinates on both sides (previously mixed the element's viewport position with the container's scroll offset).
  - `useDebouncedCallback` picks up a changed `delay` (previously memoized with `[]`, keeping the first delay forever).

### Added

- **`@rinn7e/tea-cup-prelude`**: Vitest test suite (`tests/`, `pnpm test`), included in `pnpm staged`. React code (`useDebouncedCallback`, `memoStrategy`, `devTools`) is tested with `@testing-library/react` in a per-file `jsdom` environment.

- **`@rinn7e/tea-cup-router`**:
  - `ChangeRouteNoReload` / `ModifyRouteNoReload` are now a no-op when the target route equals the current route (`config.routeEq`). Previously every dispatch pushed a new browser history entry, flooding history with duplicates of the same URL; the model (including `isInternal`) is now left untouched in that case.

---

## [1.0.2] - 2026-09-24

### Added

- **Unified Monorepo Packaging**:
  - Combined and launched the complete ecosystem of React Tea-Cup libraries under the `@rinn7e` namespace on GitHub Packages (`npm.pkg.github.com`).
  - Automated deployment workflow via `npm run publish-all` script ensuring clean topological compilation and publishing order across all packages.
  - Comprehensive `.npmrc` authentication guide and documentation for public package consumption.

- **`@rinn7e/tea-cup-prelude`**:
  - Core prelude, Elm Architecture (TEA) primitives, and FP utilities tailored for `react-tea-cup`.
  - Type-safe branded domain types: `Size`, `CacheData`, `SortedUniqueArray`, `HttpError`, and `AppRouteUpdater`.
  - Functional typeclass instances (`Eq`, `Ord`, codecs) compatible with `fp-ts` and `io-ts`.
  - Built-in memoization strategies and TEA command/subscription helpers.

- **`@rinn7e/tea-cup-router`**:
  - Pure, functional router and navigation state manager for React Tea-Cup applications.
  - Browser location subscription preventing double-update loops and out-of-sync browser history states.
  - Declarative navigation component (`Link`) and memoized link component (`LinkMemo`) with route transition helpers.
  - Direct integration with `fp-ts-routing` for type-safe bidirectional route parsing and formatting.

- **`@rinn7e/tea-cup-form`**:
  - Modular, type-safe Elm Architecture form validation and state management engine.
  - Complete suite of 9 form field sub-components:
    - **`Text`**: Text input and textarea fields with support for text variants including `{ _tag: 'Email' }`.
    - **`TextPill`**: Tag and pill input field.
    - **`Checkbox`**: Checkbox list field with standardized `ItemUiArg` and `Choice` models.
    - **`Radio`**: Radio selection list field with standardized `ItemUiArg` and `Choice` models.
    - **`Dropdown`**: Custom dropdown field with `ModelEq` allowing proper React `memo` re-renders on validation triggers.
    - **`Calendar`**: Date picker calendar field with date validation and reactive state updates.
    - **`File`**: Drag & drop file upload field with preview cards, removal controls, and error tooltips.
    - **`Combobox`**: Searchable combobox selection field.
    - **`Slider`**: Numeric range slider featuring Tailwind CSS styling, dynamic `fieldKey` ID derivation, pure document drag listeners via `Form.subscriptions`, curried `defaultSliderView(customThumbView)` renderer, value deduplication, and zero-lag transition transform during active dragging.
  - Standardized sub-component directory structure (`type.ts`, `update.ts`, `view.tsx`, `component.tsx`, `index.ts`).
  - Sub-component constructors renamed to `defaultModel()`, returning the sub-component's internal `Model` state directly for clean property overrides and spreading.
  - Pure TEA command tuple return types across all reducers (`init` returning `[Model, Cmd<Msg>]` and `update` returning `(msg: Msg) => (model: Model): [Model, Cmd<Msg>]`).
  - Standardized UI argument types across all sub-components (`Form.Text.UiArg`, `Form.Checkbox.UiArg`, `Form.Radio.UiArg`, `Form.Dropdown.UiArg`, `Form.Combobox.UiArg`, `Form.Calendar.UiArg`, `Form.File.UiArg`, `Form.Slider.UiArg`).
  - Consolidated helper utilities (`lookupForm`, `valueTextType`, `valueCalendarType`, `valueSliderType`, `runValidationForAll`, `showAllValidation`, `isFormValid`).
  - Secondary entrypoint `@rinn7e/tea-cup-form/component` providing memoized React components (`FormItemMemo`).
  - Testability attributes (`data-test`) across input elements in all sub-component view renderers.
  - Comprehensive Playwright E2E test suite covering all form fields and interaction flows in `app/example-app-e2e`.

- **`@rinn7e/tea-cup-pagination`**:
  - Standard pagination component adhering to strict Elm Architecture principles.
  - Configurable page window sizing, automatic total page count derivation, and boundary clamping.
  - Full keyboard navigation and accessible WAI-ARIA pagination attributes.
  - Separate React component entrypoint `@rinn7e/tea-cup-pagination/component` with memoized renderers.

- **`@rinn7e/tea-cup-link-pagination`**:
  - Bidirectional infinite-scroll and cursor-based stream pagination engine for chat rooms, activity feeds, and data streams.
  - Viewport-aware scroll anchoring preventing scroll-jump jitter during asynchronous prepending or appending of records.
  - Built-in integration with `RemoteData` and TEA subscriptions for streaming continuous data sets.

- **`@rinn7e/tea-cup-intersection-observer`**:
  - Declarative Intersection Observer subscription for React Tea-Cup applications.
  - Seamless viewport entry and exit detection for lazy image loading, infinite scrolling, and analytics tracking directly through TEA subscriptions without imperative event listeners.

- **`@rinn7e/tea-cup-rte-toolkit`**:
  - Functional Rich Text Editor toolkit built for React Tea-Cup applications.
  - Bi-directional state synchronization bridging rich text document state with immutable TEA models and commands.
