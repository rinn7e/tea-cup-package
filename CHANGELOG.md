# Changelog

All notable changes to **tea-cup-package** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **`@rinn7e/tea-cup-api-generator`**: New package. Generates the API layer of a React Tea-Cup app from an OpenAPI 3.0 or 3.1 spec, an AsyncAPI 2.x or 3.x spec, or both, with the `tea-cup-api-generator` command and a JSON config. For every schema it writes an io-ts codec (`<Name>Json`), a type and an `Eq` (`<Name>Eq`), and an `Ord` for ids and string enums: a named schema of a plain string or number becomes a branded type, `allOf` an intersection, a `oneOf` with a `discriminator` a union compared by its tag, and recursive schemas get an explicit type, a `t.recursion` codec and a lazy `Eq`. For every operation it writes a function returning `TaskEither<HttpError<E>, A>`, sent through a `Client` the app exports, with typed path, query (all OpenAPI styles), header and body parameters (JSON, multipart, URL-encoded, text, `Blob`), the declared error bodies as `E`, and an `operations` map for contract tests. Each AsyncAPI channel becomes a union of its message payloads, tagged when its messages carry a tag property, and the schemas of both specs are merged (a name both define must be the same schema). Renames, app types for schemas and formats, operation name affixes and channel names are set in the config, which fails the run when it names what the specs do not have. `--check` fails when a generated file is out of date. The runtime of the generated code (`send`, `queryString`, `pathParam`, the answer readers and the `Eq` helpers) is the package root. Includes a Vitest suite over three fixture projects whose generated files are type-checked and run.
- **`@rinn7e/tea-cup-prelude`**: `Tracker`, Elm's `Http` trackers for tea-cup. `Tracker.task(tracker, request)` runs a request under a name (Elm's `tracker = Just name`), giving it the `AbortSignal` to pass to its fetches, and `Tracker.cancel(tracker)` is a command that aborts it (Elm's `Http.cancel name`). As in elm/http, a name tracks one request (a newer one replaces it), a cancelled request never reports back, so no message reaches `update`, and a `Cmd.batch` runs cancels and requests in order, so `Cmd.batch([Tracker.cancel(name), …])` cancels the previous request before starting the next.
- **`@rinn7e/tea-cup-link-pagination`**: Helpers for the owner (`helper.ts`), all comparing items by key: reading (`items`, `findByKey`, `findBy`, `hasKey`, `first`, `last`, `isEmpty`, `isInitialLoaded`, `isInitialShown`, `isInitialFailed`, `isAtNewest`), changing (`mapItems`, `filterItems`, `filterMapItems`, `updateByKey`, `updateWhere`, `removeByKey`, `removeWhere`, `upsertItems`, `modifyItems`), item children (`childMsg`, `getChildMsg`, `updateChild`, `updateAllChildren`, `noChange`), scrolling (`scrollToNewest`, `setSelectedKey`, `restoreSavedScroll`, `emptyModel`) and data sources (`mkCacheHandler`, `noopHandler`, `initialFromPrev`). `UiConfig.prevFailedCustomView` / `nextFailedCustomView` render a failed end.
- **`@rinn7e/tea-cup-link-pagination`** (breaking): Items can have their own subscriptions. `LogicConfig.subscriptions: (item) => Sub<ItemMsg>` is required (`() => Sub.none()` for none), and `subscriptions(model, logicConfig)` takes the logic config: it batches every loaded item's subscriptions with the load-more triggers and delivers their messages to the item as `ChildMsg`. Items keep their subscriptions while the list scrolls.
- **`@rinn7e/tea-cup-screen-stack`**: New package. A screen stack with animated switches (`Push` / `Pop` / `PopTo` / `Replace`) whose screens are a user-defined union, each able to carry its own TEA model. Every phase is an explicit `Transition` (`Idle`, `Pushing`, `Popping`, in phase `Start` / `Run`) that holds the screens in flight until they have slid away, so the model can't represent impossible states; interruptions finish the running transition first. Screens are identified by `Config.uniqueKeyField` (unique within a stack) and send their own messages through `screenDispatch` as `ScreenMsg { key, msg }`, which the parent intercepts and applies with `getScreen` / `modifyScreen` wherever the screen is in the stack, like tea-cup-pagination's item messages. The container animates between the measured heights of the screens. Works inside a drawer (the whole stack is the drawer's payload) or on its own. `ScreenStackMemo` renders with `itemEq` / `parent` / `parentEq`. Includes a Vitest suite, an example app (drawer menu and standalone wizard) and a Playwright e2e suite.
- **`@rinn7e/tea-cup-drawer`**: New package. A drawer (bottom sheet / side panel) ported from [vaul](https://github.com/emilkowalski/vaul) to The Elm Architecture: swipe to dismiss, snap points, four directions, modal and non-modal modes, scroll-aware dragging, body scroll lock (held by the drawer's view while it shows a modal drawer, keyed by the view rather than `Config.id`, so a model replaced by a closed one or with another id, or a view unmounted while open or closing, releases exactly what it held and gives the saved focus back), and focus moved in on open and given back on close. Presses that bubble through React portals from a drawer rendered inside another drawer's content are ignored by the outer one. It has no keyboard listener: Escape and Tab are left to the owner, which knows the app's other layers (dialogs, other libraries' popups) and sends `Dismiss` or `Close`. `Config.aria` (`{ label, describedBy }`) gives the `role="dialog"` its required accessible name, as a text or its title element. `SetSnapPoints` replaces the snap points while open, e.g. measured from the content, keeping the active one. `DrawerMemo` renders the content with `renderContent(content, contentDispatch, parent)`: the payload (owned by the drawer), a dispatch for the content's own messages and `parent` (owned by the parent). The payload is identified by `Config.uniqueKeyField`; content messages arrive as `ContentMsg { key, msg }` and are applied with `getContent` / `modifyContent`, so a TEA component can live in the payload and replies from a payload that was closed or replaced (reopened while closing) are dropped. Every animation phase is an explicit `AnimateState` (`Invisible`, `Mounting`, `AnimateIn`, `Visible`, `Dragging`, `Settling`, `AnimateOut`) that keeps the opening payload until the drawer is fully closed; a press lives only in the states at rest (`Visible`, `Settling`), snap points are a `NoSnap | Snap` config whose position is a zipper, and modality is `NonModal | Modal { lockBody }`, so the model can't represent impossible states. Includes a Vitest suite, a kitchen-sink example app and a Playwright e2e suite.
- **`@rinn7e/tea-cup-scroll-container`**: New package. A scroll container that keeps the reading position while rows load above it, grow late or the viewport changes height, with every scroll decision made by a pure `update` and kept in the model. `Model.follow` says who holds the position (`AtEnd`, `Free { anchor }`, `Navigating { target, behavior, until }`, `Restoring { anchor }`); an `Anchor` is a row `key` and its top from the top edge of the viewport. Each `Msg` carries its cause (`ItemsChanged`, `ViewportResized`, `ReaderScrolled`, `ScrollSettled`, `ScrollTo`, `Restore`, `Placed`, `EdgeShown`). The view (`ScrollContainer`, from `@rinn7e/tea-cup-scroll-container/component`) is the one writer of the scroll offset: it applies each decision (`pendingAdjust`) once, before paint, through a `Virtualizer` of `@tanstack/virtual-core`. `Config` sets the policies (`onPrepend`, `onViewportResize`, `onItemResize`, `virtualize`), with the presets `chatConfig` (newest at the end, virtualized) and `feedConfig` (newest at the start). A scroll of ours to a row is aimed again while the rows around it grow, and can hide the list (`hide`, `isPlacing`) until a frame painted it in place; the input of the reader (`ReaderScrolled`) always takes over. The owner stores the row at the top of the view from `onAnchor`, puts it back with `Restore`, loads more on `EdgeShown` (`watchEdges`), and can draw an `overlay` from an `OverlayView`. `rowBounds` reads where a row is, drawn or not. Includes a Vitest suite (the view in jsdom).
- **`@rinn7e/tea-cup-drawer`**: `outsideTap` prop. While a drawer shows, a click in its container outside the drawer and any other drawer, its backdrop, a dialog or a menu is sent as the new `OutsideTapped`, which the drawer ignores and the owner intercepts; the tap still reaches what was tapped. For a non-modal drawer whose owner reacts to a tap outside it only in some states.
- **`@rinn7e/tea-cup-prelude`**: `withBudget(promise, budgetMs, fallback, onTimeout?)` resolves a promise, or `fallback()` if it takes longer than `budgetMs`. The slower promise is abandoned (not cancelled), and its later rejection is swallowed.
- **`@rinn7e/tea-cup-intersection-observer`**: Vitest suite (`tests/`, `pnpm test`), included in `pnpm staged`.

### Changed

- **`@rinn7e/tea-cup-link-pagination`** (breaking): The model kept facts twice, in fields whose types allowed states that can't happen, and owners read and rewrote it by hand.
  - Each end is one `Edge` (`Idle`, `Loading`, `Failed { error }`, `Exhausted`), replacing `prevData` / `nextData` (`RemoteData`) and `prevIsMax` / `nextIsMax`. `allowRetryPrev` is removed.
  - The first page is `Mode.initial: Initial` (`NotStarted`, `Loading`, `Cached`, `Failed { error }`, `Loaded`), replacing `initialData`; its items are only in `overallData`. A refresh of a loaded list stays `Loaded`.
  - `Model.initialScrollDone: boolean` is now `initialScroll: InitialScroll` (`Pending`, `FromCache { key }`, `Done`). The view sends the new `ReaderScrolled` on the reader's wheel, touch or key input, which ends `FromCache`, so the API's answer doesn't pull a reader of the cached rows back to the target.
  - The change the view still has to apply is one `Model.pendingChange: PendingChange` (`None`, `KeepPosition { before: ScrollSnapshot | null }`, `RecordPosition`), replacing `containerChangeEvent` and its snapshot. It is set with `setContainerChangeEvent(refs, event)(model)`, which takes the snapshot.
  - The reading position is a `ScrollStateMap` (`ReadonlyMap` of `ScrollAnchor { key, top }`) in an fp-ts `IORef` the owner makes with `newScrollStateRef` (was `mkScrollStateMap`, a mutable `Map`). `storeScrollState(ref)` / `restoreScrollState(ref)` and `onContainerScroll` return `IO<void>`. `Model.savedScrollPos` and `Refs.currentScrollPosRef` / `currentScrollHeightRef` are removed; a list shown again is restored with `restoreSavedScroll(config, ref, { resetEdges })`, which drops a change the list had pending while it was away.
  - `LogicConfig.mode` and `LogicConfig.eqWithKey` are removed: items are compared by `uniqueKeyField`. The animation fields (`retriggerCurrentData`, `animationEnd`) are removed.
  - `replaceFuncHandler(config, model, { func, containerChangeEvent? })` sets the pending change itself, as sending `ReplaceFunc` does, and `mapFuncHandler` is built on it.
  - `getInitialDataFromApiCmd` takes the cached rows as a third argument.
  - `Model.invisWhileScrolling: boolean` is now `visibility: Visibility` (`Visible`, `HiddenForScroll { key }`, `HiddenForRestore`), so only the end of the scroll or restore that hid the list shows it again. `ScrollToCurrentDone` carries the `selectedKey` it scrolled to instead of the unused `param`, and `SetInvisWhileScrolling { value }` is replaced by `RestoreDone`.
  - The view reports a drawn change with the new `PendingChangeApplied`; `SetContainerChangeEvent` with `NoChange` no longer clears a pending change.
  - `SetModeAndAddUpdateData` and `setModeAndAddUpdateDataHandler` are removed. They swapped a list's `mode` in place and kept the old open's state (`visibility`, `initialScroll`); build a new list with `init` instead, passing the same `onContainerScroll` and `shouldRestoreScrollState`.
  - `LogicConfig.dataSourceIdAttribute` is removed: the reading position is kept only from rows with the default attribute, so a list that renamed it never kept its position. Rows always carry `data-link-pagin-datasource-id` (the exported `dataSourceIdAttribute`, was `defaultDataSourceIdAttribute`).
  - An open's cache read must return the cached page around its target, or nothing when the target isn't cached, as its endpoint does (`InitialHandler`): the cache step now always shows the cached rows, and scrolls to the target in them.
- **`@rinn7e/tea-cup-link-pagination`** (breaking): Renamed the one-letter names to match `tea-cup-pagination`. Type parameters `A` → `Item`, `B` → `Parent`, `amsg` → `ItemMsg`, `pmsg` → `ParentMsg`. Props `aEq` → `itemEq`, `b` → `parent`, `bEq` → `parentEq`, `mkPmsg` → `mkParentMsg`, `dispatchP` → `dispatchParent`. `CustomUiParam` fields `b` → `parent`, `withPrevNextA` → `withPrevNextItem`, `selectedA` → `selectedItem`, `allA` → `allItems`; `WithPrevAndNext` fields `a` / `prevA` / `nextA` → `item` / `prevItem` / `nextItem`; `LogicConfig.update` takes `parent` (was `parentSt`); `getSelectedA` → `getSelectedItem`, `isAEqual` → `isItemEqual`.
- **`@rinn7e/tea-cup-pagination`** (breaking): Item messages carried a copy of the item taken when they were sent, so handlers (and replies such as API responses) could act on stale data, and every parent had to find and replace items in `model.items` itself. `Config` now takes `uniqueKeyField: (item: Item) => string`, `ItemMsg` carries `key` instead of `item` (`renderItems`' `itemDispatch(item, msg)` is unchanged and derives the key), and the new helpers `getItem(config, key)` and `modifyItem(config, key, f)` read and update the current item. The parent still applies item updates. Adds a Vitest suite.
- **`@rinn7e/tea-cup-pagination`** (breaking): `PaginationMemo` couldn't reflect parent state. `config` is compared with `EqAlways`, so render functions closing over the parent model rendered stale (e.g. highlighting the product open in a modal) until the pagination model itself changed. `Props` now take `parent` and `parentEq`, and `renderItems` / `renderPagination` receive `parent` as their last argument. `Config`, `Props`, `init` and `update` gain a `Parent` type parameter, and `mkPropsEq` takes `parentEq`.
- **`@rinn7e/tea-cup-form`**: A field's error showed as soon as its value changed, so typing the first character of a username already said it was too short. Changing a text, text pill, dropdown or calendar value (`UpdateValue`, `UpdateEvent`, `UpdateTextPill`, `AddPill`, `RemovePill`, `UpdateDropdownType`, `UpdateCalendar`) no longer shows its validation: the error shows once the field loses focus (`HandleFocus`), or for every field with `showAllValidation` (e.g. on a submit attempt), as before the fields were split into sub-components.
- **`@rinn7e/tea-cup-link-pagination`** (breaking): The list renders through `@rinn7e/tea-cup-scroll-container` (a new peer dependency, replacing `@rinn7e/tea-cup-intersection-observer`) instead of managing its own scroll. The scroll container keeps the reading position through any change of the rows, so everything that told the view where a change lands, and the scroll state built on it, is removed: `Model.pendingChange` (`PendingChange`, `ScrollSnapshot`), `ContainerChangeEvent` and the `containerChangeEvent` of `ReplaceFunc` / `MapFunc` / `replaceFuncHandler`, `setContainerChangeEvent`, `setOrKeepContainerChangeEvent`, `pendingChangeApplied`, the `noChange` helper, `Model.visibility` (`Visibility`), `Model.isScrolling`, `onContainerScroll`, `shouldRestoreScrollState` (`mkShouldRestoreScrollState`, `restoreScrollState`, `readScrollAnchor`), `LogicConfig.visibleStrategy`, `UiConfig.customAllItemUi`, `customAllItemEffect`, `titleView` and `disableScrolling`, `Refs.itemRefs`, `dataSourceIdAttribute`, `checkVisibleAndScrollToCurrent`, `forceScrollToHandler`, and the messages `SetContainerChangeEvent`, `PendingChangeApplied`, `ReaderScrolled`, `ForceScrollTo`, `SetIsScrolling`, `ScrollToCurrentDone` and `RestoreDone`. The ends no longer load from hidden load-more buttons: they load when the header or footer of the container comes into view (its `EdgeShown`), and `subscriptions` holds only the subscriptions of the items.
  - `LogicConfig.scrollContainer` (`chatConfig` for a reversed list, `feedConfig` otherwise) is required; `LogicConfig.scrollToKeyOffset` lands a `ScrollToKey` row under a bar floating over the list. `LogicConfig.update` returns `[Item, Cmd<ItemMsg>]` (no change event).
  - `Model.scrollContainer` holds the state of the container, whose messages arrive as `ScrollContainerMsg`; `ui.loadingView` shows while it places the list. `Mode.selectedAnchor` lands the opened row at a stored offset.
  - `init(networkStatus, mode, onAnchor?)`: the reading position comes from the row the container reports at the top of the view (`onAnchor`), stored with `storeScrollState(ref)`, which now takes `(dataSourceId, anchor)`. `restoreSavedScroll(ref, { resetEdges })` no longer takes the logic config.
  - `ScrollToNewest` takes an optional `behavior`. `ScrollToKey` highlights its row (`Model.flash`, the `bg-fade-out` class, cleared by the new `FlashDone` after `FLASH_MS`).
  - Pages that arrive while the reader moves the list wait in `Model.heldPages` and go in once it comes to rest (iOS does not allow the position to move while a finger or a fling moves the list).
  - `UiConfig.itemPrefixUi` (a view above an item inside its row) and `UiConfig.topItemOverlayUi` (a view over the list, given the item at the top) take the place of `customAllItemUi` (views drawn around rows).
  - This replaces the `pendingChange`, `visibility` and scroll state changes described above.
- **`@rinn7e/tea-cup-drawer`** (breaking): `Config.repositionInputs` and `followKeyboard` are removed: the drawer no longer lifts itself above the on-screen keyboard. The page is expected to resize above the keyboard itself, and the default views cap a top or bottom drawer at `max-h-[96%]` of its containing block (was `96dvh`), so it fits the page that is left.
- **`@rinn7e/tea-cup-drawer`**: Gestures with scrollers inside the drawer. A pull that opens a top or bottom drawer further from a snap point, pressed inside a scroller that can still scroll that way (the new press fact `scrollerTakesOpening`), scrolls the scroller to its end first. A push toward closed from the first snap point of a drawer that is not `dismissible` goes to the content. Touch moves of a press that will drag are cancelled before it reaches `dragThreshold` (Android starts the native pan of a scroller on its first move past its touch slop), decided by the new `takesPress`, `decideMove` and `touchMoveDecision`; inside a scroller across the drawer axis (the new press fact `isInCrossScroller`) those first moves are left to the scroller. `Press` gains `scrollerTakesOpening` and `isInCrossScroller`, and `decideDrag` takes the `snapIndex` of the drawer pressed.
- **`@rinn7e/tea-cup-intersection-observer`**: A watched element not in the document yet (React mounts it later, or a row of a virtualized list is not drawn) is observed once it is added, checked by one `MutationObserver` shared by every waiting watch, instead of a retry every 50 ms per watch.

### Fixed

- **`@rinn7e/tea-cup-link-pagination`**:
  - Loading older items moved the view by the height of anything that had grown since the last scroll (an image, a font, content reflowing): the position was kept against a height recorded at the last `scroll` event. The model update now takes a snapshot of the container (`pendingChange`'s `KeepPosition { before }`) while the old rows are still on screen, and the view keeps the position from it in a `useLayoutEffect`, before paint (it ran after paint, so the new rows could show at the wrong place for a frame).
  - In browsers without scroll anchoring (WebKit), an image or a video above the view that got its size late pushed the items the user was reading down. The list now moves the scroll position by the growth on `load` / `loadedmetadata` when the media starts above the view and the container's computed `overflow-anchor` isn't `auto` (WebKit, or a stylesheet that turns anchoring off). The growth is measured against the height after the last render, so content that grew without media (a message that expands) isn't counted.
  - Opening a list at an item showed the cached rows at the top while the API request was in flight, loaded the older page because of it, then hid the list and jumped to the item. Cached rows are now shown and scrolled to the target at once (an open's cache read returns the page around it, or nothing), and the API step scrolls again only if it moved the target (hidden) or changed the rows (without hiding the list).
  - A cache read or an endpoint that threw was turned into `NoOp`, which left the list loading for good (the first page's API request is started by its cache response). Every load Cmd now reports the failure through its response message, and an endpoint's own error reaches the list as it is.
  - A failed older or newer page could never load again in the same open. It now shows "Couldn't load more." with a Retry button.
  - Scrolling while a list opened from the cache could stop newer pages loading for good: the cached rows counted as loaded, so the newer end started loading from them, and the API's answer then reset that load to idle, so a second load ran and marked the end exhausted. The ends now load only once the API answered (`Initial.Cached` until then), and the API's answer keeps a load in flight or a failure.
  - A pending change on top was lost when another change (an item's message that moves nothing, such as a hover, or one in place) arrived before the view drew it: the new `containerChangeEvent` replaced it, and the view jumped by the older page's height. Changes now combine, and only the view clears them once drawn.
  - A first load that failed with nothing to show set `initialScrollDone`, so a later refresh showed the rows without scrolling to the target. The open now stays `Pending` until a load brings rows.
  - Adds a Vitest suite.
- **`@rinn7e/tea-cup-form`**:
  - A text field's link validation (`linkValidations`, e.g. a repeated password checked against the first) stopped following the field it is linked to: the memoized field ignored `forms`, so the error stayed after the linked field was fixed, and didn't show after it was broken. The field now re-renders when a field it validates against changes.
  - Picking a dropdown option no longer blurs the field: the option's `mousedown` calls `preventDefault()` again, as before the fields were split into sub-components. `UpdateDropdownType` no longer carries the unused `event`.

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
