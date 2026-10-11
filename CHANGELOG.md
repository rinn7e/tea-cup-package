# Changelog

All notable changes to **tea-cup-package** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **`@rinn7e/tea-cup-link-pagination`**: Helpers for the owner (`helper.ts`), all comparing items by key: reading (`items`, `findByKey`, `findBy`, `hasKey`, `first`, `last`, `isEmpty`, `isInitialLoaded`, `isInitialShown`, `isAtNewest`), changing (`mapItems`, `filterItems`, `filterMapItems`, `updateByKey`, `updateWhere`, `removeByKey`, `removeWhere`, `upsertItems`, `modifyItems`), item children (`childMsg`, `getChildMsg`, `updateChild`, `updateAllChildren`, `noChange`), scrolling (`scrollToNewest`, `setSelectedKey`, `restoreSavedScroll`, `emptyModel`) and data sources (`mkCacheHandler`, `noopHandler`, `initialFromPrev`). `UiConfig.prevFailedCustomView` / `nextFailedCustomView` render a failed end.
- **`@rinn7e/tea-cup-link-pagination`** (breaking): Items can have their own subscriptions. `LogicConfig.subscriptions: (item) => Sub<ItemMsg>` is required (`() => Sub.none()` for none), and `subscriptions(model, logicConfig)` takes the logic config: it batches every loaded item's subscriptions with the load-more triggers and delivers their messages to the item as `ChildMsg`. Items keep their subscriptions while the list scrolls.
- **`@rinn7e/tea-cup-screen-stack`**: New package. A screen stack with animated switches (`Push` / `Pop` / `PopTo` / `Replace`) whose screens are a user-defined union, each able to carry its own TEA model. Every phase is an explicit `Transition` (`Idle`, `Pushing`, `Popping`, in phase `Start` / `Run`) that holds the screens in flight until they have slid away, so the model can't represent impossible states; interruptions finish the running transition first. Screens are identified by `Config.uniqueKeyField` (unique within a stack) and send their own messages through `screenDispatch` as `ScreenMsg { key, msg }`, which the parent intercepts and applies with `getScreen` / `modifyScreen` wherever the screen is in the stack, like tea-cup-pagination's item messages. The container animates between the measured heights of the screens. Works inside a drawer (the whole stack is the drawer's payload) or on its own. `ScreenStackMemo` renders with `itemEq` / `parent` / `parentEq`. Includes a Vitest suite, an example app (drawer menu and standalone wizard) and a Playwright e2e suite.
- **`@rinn7e/tea-cup-drawer`**: New package. A drawer (bottom sheet / side panel) ported from [vaul](https://github.com/emilkowalski/vaul) to The Elm Architecture: swipe to dismiss, snap points, four directions, modal and non-modal modes, scroll-aware dragging, body scroll lock (held by the drawer's view while it shows a modal drawer, keyed by the view rather than `Config.id`, so a model replaced by a closed one or with another id, or a view unmounted while open or closing, releases exactly what it held and gives the saved focus back), and focus moved in on open and given back on close. Presses that bubble through React portals from a drawer rendered inside another drawer's content are ignored by the outer one. It has no keyboard listener: Escape and Tab are left to the owner, which knows the app's other layers (dialogs, other libraries' popups) and sends `Dismiss` or `Close`. `Config.aria` (`{ label, describedBy }`) gives the `role="dialog"` its required accessible name, as a text or its title element. `SetSnapPoints` replaces the snap points while open, e.g. measured from the content, keeping the active one. `DrawerMemo` renders the content with `renderContent(content, contentDispatch, parent)`: the payload (owned by the drawer), a dispatch for the content's own messages and `parent` (owned by the parent). The payload is identified by `Config.uniqueKeyField`; content messages arrive as `ContentMsg { key, msg }` and are applied with `getContent` / `modifyContent`, so a TEA component can live in the payload and replies from a payload that was closed or replaced (reopened while closing) are dropped. Every animation phase is an explicit `AnimateState` (`Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut`) that keeps the opening payload until the drawer is fully closed; a press lives only in the states at rest (`Visible`, `Settling`), snap points are a `NoSnap | Snap` config whose position is a zipper, and modality is `NonModal | Modal { lockBody }`, so the model can't represent impossible states. Includes a Vitest suite, a kitchen-sink example app and a Playwright e2e suite.

### Changed

- **`@rinn7e/tea-cup-link-pagination`** (breaking): The model kept facts twice, in fields whose types allowed states that can't happen, and owners read and rewrote it by hand.
  - Each end is one `Edge` (`Idle`, `Loading`, `Failed { error }`, `Exhausted`), replacing `prevData` / `nextData` (`RemoteData`) and `prevIsMax` / `nextIsMax`. `allowRetryPrev` is removed.
  - The first page is `Mode.initial: Initial` (`NotStarted`, `Loading`, `Cached`, `Failed { error }`, `Loaded`), replacing `initialData`; its items are only in `overallData`.
  - `Model.initialScrollDone: boolean` is now `initialScroll: InitialScroll` (`Pending`, `FromCache { key }`, `Done`).
  - The change the view still has to apply is one `Model.pendingChange: PendingChange` (`None`, `KeepPosition { before: ScrollSnapshot | null }`, `RecordPosition`), replacing `containerChangeEvent` and its snapshot. It is set with `setContainerChangeEvent(refs, event)(model)`, which takes the snapshot.
  - The reading position is a `ScrollStateMap` (`ReadonlyMap` of `ScrollAnchor { key, top }`) in an fp-ts `IORef` the owner makes with `newScrollStateRef` (was `mkScrollStateMap`, a mutable `Map`). `storeScrollState(ref)` / `restoreScrollState(ref)` and `onContainerScroll` return `IO<void>`. `Model.savedScrollPos` and `Refs.currentScrollPosRef` / `currentScrollHeightRef` are removed; a list shown again is restored with `restoreSavedScroll(config, ref, { resetEdges })`.
  - `LogicConfig.mode` and `LogicConfig.eqWithKey` are removed: items are compared by `uniqueKeyField`. The animation fields (`retriggerCurrentData`, `animationEnd`) are removed.
  - `replaceFuncHandler(config, model, { func, containerChangeEvent? })` sets the pending change itself, as sending `ReplaceFunc` does, and `mapFuncHandler` is built on it.
  - `getInitialDataFromApiCmd` takes the cached rows as a third argument.
- **`@rinn7e/tea-cup-link-pagination`** (breaking): Renamed the one-letter names to match `tea-cup-pagination`. Type parameters `A` → `Item`, `B` → `Parent`, `amsg` → `ItemMsg`, `pmsg` → `ParentMsg`. Props `aEq` → `itemEq`, `b` → `parent`, `bEq` → `parentEq`, `mkPmsg` → `mkParentMsg`, `dispatchP` → `dispatchParent`. `CustomUiParam` fields `b` → `parent`, `withPrevNextA` → `withPrevNextItem`, `selectedA` → `selectedItem`, `allA` → `allItems`; `WithPrevAndNext` fields `a` / `prevA` / `nextA` → `item` / `prevItem` / `nextItem`; `LogicConfig.update` takes `parent` (was `parentSt`); `getSelectedA` → `getSelectedItem`, `isAEqual` → `isItemEqual`.
- **`@rinn7e/tea-cup-pagination`** (breaking): Item messages carried a copy of the item taken when they were sent, so handlers (and replies such as API responses) could act on stale data, and every parent had to find and replace items in `model.items` itself. `Config` now takes `uniqueKeyField: (item: Item) => string`, `ItemMsg` carries `key` instead of `item` (`renderItems`' `itemDispatch(item, msg)` is unchanged and derives the key), and the new helpers `getItem(config, key)` and `modifyItem(config, key, f)` read and update the current item. The parent still applies item updates. Adds a Vitest suite.
- **`@rinn7e/tea-cup-pagination`** (breaking): `PaginationMemo` couldn't reflect parent state. `config` is compared with `EqAlways`, so render functions closing over the parent model rendered stale (e.g. highlighting the product open in a modal) until the pagination model itself changed. `Props` now take `parent` and `parentEq`, and `renderItems` / `renderPagination` receive `parent` as their last argument. `Config`, `Props`, `init` and `update` gain a `Parent` type parameter, and `mkPropsEq` takes `parentEq`.

### Fixed

- **`@rinn7e/tea-cup-link-pagination`**:
  - Loading older items moved the view by the height of anything that had grown since the last scroll (an image, a font, content reflowing): the position was kept against a height recorded at the last `scroll` event. The model update now takes a snapshot of the container (`pendingChange`'s `KeepPosition { before }`) while the old rows are still on screen, and the view keeps the position from it in a `useLayoutEffect`, before paint (it ran after paint, so the new rows could show at the wrong place for a frame).
  - In browsers without scroll anchoring (WebKit), an image or a video above the view that got its size late pushed the items the user was reading down. The list now moves the scroll position by the growth on `load` / `loadedmetadata` when the media starts above the view.
  - Opening a list at an item showed the cached rows at the top while the API request was in flight, loaded the older page because of it, then hid the list and jumped to the item. Cached rows that hold the target are now shown and scrolled to at once, cached rows without it aren't shown, and the API step scrolls again only if it moved the target (hidden) or changed the rows (without hiding the list).
  - A cache read or an endpoint that threw was turned into `NoOp`, which left the list loading for good (the first page's API request is started by its cache response). Every load Cmd now reports the failure through its response message.
  - A failed older or newer page could never load again in the same open. It now shows "Couldn't load more." with a Retry button.
  - Scrolling while a list opened from the cache could stop newer pages loading for good: the cached rows counted as loaded, so the newer end started loading from them, and the API's answer then reset that load to idle, so a second load ran and marked the end exhausted. The ends now load only once the API answered (`Initial.Cached` until then), and the API's answer keeps a load in flight or a failure.
  - Adds a Vitest suite.

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
