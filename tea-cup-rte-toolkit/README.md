# tea-cup-rte-toolkit

A Rich Text Editor toolkit designed for **React Tea-Cup** applications.

## Inspiration

This package is a TypeScript/React port of the excellent Elm library
[elm-rte-toolkit](https://github.com/mweiss/elm-rte-toolkit) by mweiss.

The original Elm library models a rich text editor using the [The Elm Architecture (TEA)](https://guide.elm-lang.org/architecture/).
This port preserves that model-view-update structure through [tea-cup-fp](https://github.com/nicowillis/tea-cup-fp),
making it suitable for React applications that follow the same unidirectional data-flow pattern.

---

## Differences from the Elm Version

While the TypeScript port closely mirrors the Elm source in structure and intent, there are several
important architectural and implementation differences. These are documented here for developers
familiar with the original Elm library.

---

### 1. Module System: TypeScript vs Elm

**Elm** uses its own module system with explicit `exposing (...)` declarations.

**TypeScript** uses ES modules with named and re-exported symbols via `src/index.ts`. All public
API is re-exported from the index barrel.

---

### 2. `Config<Msg>` is an Interface, Not an Opaque Type

**Elm** wraps the config in an opaque type `Config msg` using a private constructor
(`Config { decorations, spec, commandMap, toMsg }`), preventing direct field access.

**TypeScript** uses a plain `interface Config<Msg>` with `readonly` fields:

```ts
export interface Config<Msg> {
  readonly decorations: Decorations<Msg>
  readonly spec: Spec
  readonly commandMap: CommandMap
  readonly toMsg: (msg: Message) => Msg
}
```

The `config()` function still exists as a constructor helper, but the type itself is transparent.
This is intentional — TypeScript's structural typing makes sealed opaque types unnecessary in practice.

---

### 3. `Maybe` → `Option` via fp-ts

**Elm** uses `Maybe a` (`Nothing | Just a`) throughout.

**TypeScript** uses [`fp-ts`](https://gcanti.github.io/fp-ts/)'s `Option<A>` (`{ _tag: 'None' } | { _tag: 'Some', value: A }`)
as a direct structural analog. You will find `O.none`, `O.some(x)`, `O.isSome()`, `O.chain()`, `pipe()`, etc.
used throughout in place of Elm's `Maybe` combinators.

---

### 4. `Result` → `Either` via fp-ts

**Elm** uses `Result String a` (`Err String | Ok a`).

**TypeScript** uses `Either<string, A>` from fp-ts (`{ _tag: 'Left', left: string } | { _tag: 'Right', right: A }`).

---

### 5. `Array` → `Array<T>` (Mutable JS Arrays)

**Elm** uses its immutable `Array` type (backed by balanced trees).

**TypeScript** uses standard mutable JavaScript `Array<T>`, with care taken to avoid in-place
mutations where immutability is required. Results of transformations are always new arrays.

---

### 6. `Dict` → `Map`

**Elm** uses `Dict String v` for name-keyed registries (e.g., element/mark decorators).

**TypeScript** uses the native `Map<string, V>` type throughout
(e.g., `Map<string, Array<ElementDecoration<Msg>>>`).

---

### 7. `Decorations` — Attribute Representation

**Elm** decorations return `List (Html.Attribute msg)` — real Elm virtual DOM attributes produced by
`Html.Attributes.class`, `Html.Events.onClick`, etc.

**TypeScript** decorations return `Array<Attribute<Msg>>` where:

```ts
type Attribute<Msg> = [string, string | ((event: never) => Msg | void)]
```

Each attribute is a `[key, value]` tuple. The key is a React prop name (e.g., `"className"`, `"onClick"`,
`"onChange"`). The value is either a static string or an event handler function.

> **Key differences:**
>
> - **`onClick`** handlers receive no event argument (returns `Msg | void`). The editor calls
>   `val(undefined as never)` internally, matching Elm's `Html.Events.onClick msg` which takes no event parameter.
> - **Other `on*` handlers** (e.g., `onKeyDown`, `onChange`) do receive a typed event argument.
>   The contravariant `(event: never) => Msg | void` signature allows any typed event function to be
>   stored without `any` casts — TypeScript accepts narrower types where `never` is expected.
> - In Elm, `topLevelAttributes` is `List (Html.Attribute msg)`. In TypeScript, it is `Array<Attribute<Msg>>`.

---

### 8. `viewHtmlNode` — Decorator Application

**Elm** (`viewHtmlNode`) applies decorators by mapping them to `Html.Attribute msg` values using
`Html.node name (attrs ++ decoratorAttrs) children`.

**TypeScript** (`viewHtmlNode`) applies decorators by building a `reactProps` object for
`React.createElement`. The rendering logic:

- `"class"` attributes from the spec → `reactProps.className`
- `"className"` decorator attributes → merged into `reactProps.className`
- `"onClick"` → wrapped in `e.preventDefault(); e.stopPropagation(); dispatch(msg)` (Elm does the same via `Html.Events.onClick`)
- Other `on*` handlers → wrapped to call `dispatch(msg)` if the handler returns a non-`undefined` message
- Other string attributes → passed directly to React props

---

### 9. `SelectionState` — DOM Child Lookup

**Elm** (`elmEditor.js` line 339):

```js
const selection = this.childNodes[1].getSelectionObject()
```

This relies on `selection-state` being always the second child node (`childNodes[1]`). In pure
Elm-rendered HTML this works reliably, since Elm's virtual DOM does not inject text nodes.

**TypeScript** (our port) uses a safer, React-compatible approach:

```ts
const selectionStateCandidate = this.querySelector('selection-state')
const selectionStateEl =
  selectionStateCandidate instanceof SelectionState
    ? selectionStateCandidate
    : null
```

React may inject whitespace text nodes between children during hydration/reconciliation, which would
make `childNodes[1]` point to the wrong element. Using `querySelector('selection-state')` is
robust against this and also does a proper `instanceof SelectionState` type guard.

---

### 10. `SelectionState.attributeChangedCallback` — Early Return Guard

**Elm** does not guard against a `null` newValue since Elm's attribute management never sets
a custom attribute to `null`.

**TypeScript** adds:

```ts
if (name !== 'selection' || !newValue) {
  return
}
```

This is because React can call `attributeChangedCallback` with `null` during unmounting or initial
renders before the value is set.

---

### 11. `SelectionState.getSelectionPath` / `findNodeFromPath` — `parentNode` Guard

**Elm** (`elmEditor.js`):

```js
getSelectionPath(node, offset) {
  return getSelectionPath(node, this.parentNode, offset)
}
```

`this.parentNode` is assumed to always be the `ElmEditor` element and is passed directly.

**TypeScript** adds an `instanceof HTMLElement` guard before use:

```ts
getSelectionPath(node: Node | null, offset: number): number[] | null {
  if (!(this.parentNode instanceof HTMLElement)) {
    return null
  }
  return getSelectionPath(node, this.parentNode, offset)
}
```

This correctly handles the edge case where `SelectionState` is transiently detached from its parent
(e.g., during React reconciliation).

---

### 12. `selectionChange` — Event Parameter Ignored

**Elm** (`elmEditor.js` line 220):

```js
selectionChange(e) {
  let selection = this.getSelectionObject(e);
  ...
}
```

The `e` parameter is passed to `getSelectionObject` but is never used inside that function.
This is effectively dead code in the Elm version.

**TypeScript** (`web-component.ts`) correctly calls `this.getSelectionObject()` with no arguments,
matching the actual signature.

---

### 13. `Decorations.topLevelAttributes` — Type Difference

**Elm**: `topLevelAttributes` is `List (Html.Attribute msg)` — native Elm virtual DOM attributes.

**TypeScript**: `topLevelAttributes` is `Array<Attribute<Msg>>` — `[key, value]` tuples, applied to
the `contenteditable` div's React props in `RteEditor`.

> If you want to add a plain HTML attribute as a top-level attribute in TypeScript, use:
>
> ```ts
> withTopLevelAttributes([['data-gramm_editor', 'false']], decorations)
> ```

---

### 14. Keyed Rendering

**Elm** uses `Html.Keyed.node` for the `elm-editor` and inner `div` to control re-rendering.

**TypeScript** uses standard `React.createElement` with React's `key` prop:

- The outer `elm-editor` element is not keyed (it's always stable).
- The inner content `div` uses `key={InternalEditor.completeRerenderCount(editor)}`.
- The inner `div` wrapper uses `key={InternalEditor.renderCount(editor)}`.

This maps to the same behaviour as Elm's keyed nodes.

---

### 15. Event Decoding: JSON Decoders vs Direct Access

**Elm** uses `Json.Decode` pipelines to decode custom event detail objects from the DOM:

```elm
editorChangeDecoder : D.Decoder Message
editorChangeDecoder =
  D.map ChangeEvent (D.map5 EditorChange ...)
```

**TypeScript** directly accesses `(e as CustomEvent<EditorChangeDetail>).detail` — no JSON
decoding step is needed since we're operating in the same JS runtime.

---

### 16. `handleCompositionStart` Is Inlined

**Elm** has a dedicated `handleCompositionStart : Editor -> Editor` function.

**TypeScript** does not have this as a separate function — the `CompositionStart` message is handled
inline in `update()`:

```ts
case 'CompositionStart':
  return InternalEditor.withComposing(true, editor_)
```

---

### 17. `HtmlToElement` / `fromHtmlNode` — Definition Parameter Type

**Elm**:

```elm
type alias HtmlToElement =
    ElementDefinition -> HtmlNode -> Maybe ( Element, List HtmlNode )
```

**TypeScript**:

```ts
type HtmlToElement = (
  definition: ElementDefinition,
  node: HtmlNode,
) => Option<[Element, Array<HtmlNode>]>
```

The `definition` parameter in both versions receives the `ElementDefinition` itself. In older
TypeScript ports, this was incorrectly typed as `any` — it is now fully typed as `ElementDefinition`.

---

### 18. `domNodeListToHtmlNodeArray` — Node Type Narrowing

**Elm** (JavaScript interop): no type narrowing needed, JS is dynamically typed.

**TypeScript** previously used:

```ts
if (node.nodeType === Node.ELEMENT_NODE) {
  const element = node as HTMLElement
```

The port now uses the correct `instanceof Element` narrowing:

```ts
if (node instanceof Element) {
  const element = node
```

This avoids an unsafe `as HTMLElement` cast while being semantically equivalent — `Element` is the
correct DOM interface for element nodes (not `HTMLElement`, which is only for HTML-specific elements).

---

## Quick Start

```ts
import {
  config,
  createState,
  editor,
  update,
  view,
} from '@rinn7e/tea-cup-rte-toolkit'
import { defaultCommandMap, markdown } from '@rinn7e/tea-cup-rte-toolkit'
import { emptyDecorations } from '@rinn7e/tea-cup-rte-toolkit'

// Define your config
const myConfig = config({
  decorations: emptyDecorations(),
  commandMap: defaultCommandMap,
  spec: markdown,
  toMsg: (msg) => ({ _tag: 'EditorMsg', msg }),
})

// Initialize editor
const initialEditor = editor(createState(myDocNode, O.none))

// In your update function
const nextEditor = update(myConfig, msg, currentEditor)

// In your view
const element = view(myConfig, currentEditor, dispatch)
```
