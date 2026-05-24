# @rinn7e/tea-cup-intersection-observer

An Intersection Observer package for React Tea-Cup applications.

Inspired by [react-intersection-observer](https://github.com/thebuilder/react-intersection-observer) but adapted to The Elm Architecture (TEA) using `tea-cup-fp` subscriptions.

## Features

- **Elm-like Subscriptions**: Manage intersection states using declarative TEA subscriptions (`Sub<Msg>`).
- **Resource Optimized**: Automatically creates a single `IntersectionObserver` instance per unique combination of options, sharing instances using reference counting to minimize browser overhead.
- **React Lifecycle Resilient**: Safely handles mount timing; if the target DOM element is not yet in the DOM during subscription initialization, it automatically retries with a short delay.

## Installation

```bash
pnpm add @rinn7e/tea-cup-intersection-observer
```

Ensure you also have `tea-cup-fp` installed in your project.

## Usage

### 1. View Layer

Define an element with a unique ID in your React view:

```typescript
import { ReactNode } from 'react'

export function MyComponent(): ReactNode {
  return (
    <div id="my-observed-element" style={{ height: '100px', background: 'lightblue' }}>
      Observe me!
    </div>
  )
}
```

### 2. Messages & Subscriptions

In your application's `subscriptions` function, watch the element ID and map the intersection state to a message:

```typescript
import * as TeaObserver from "@rinn7e/tea-cup-intersection-observer";
import { Sub } from "tea-cup-fp";

export type Msg = {
  type: "ElementInViewChanged";
  inView: boolean;
  entry: IntersectionObserverEntry;
};

export function subscriptions(model: Model): Sub<Msg> {
  return TeaObserver.watch(
    "my-observed-element",
    {
      threshold: 0.5, // Trigger when 50% of the element is visible
    },
    (inView, entry) => ({
      type: "ElementInViewChanged",
      inView,
      entry,
    }),
  );
}
```

### 3. Update Layer

Handle the state changes in your `update` function:

```typescript
export function update(msg: Msg, model: Model): [Model, Cmd<Msg>] {
  switch (msg.type) {
    case "ElementInViewChanged":
      return [{ ...model, isElementVisible: msg.inView }, Cmd.none()];
  }
}
```

## API Reference

### `watch<Msg>(elementId: string, options: IntersectionOptions, tagger: (inView: boolean, entry: IntersectionObserverEntry) => Msg): Sub<Msg>`

Creates a subscription that monitors the visibility of a DOM element.

- `elementId`: The HTML `id` attribute of the element to watch.
- `options`: Configuration options extending standard `IntersectionObserverInit`:
  - `root?: Element | Document | null`: The element/document bounds treated as the viewport.
  - `rootMargin?: string`: Margin around the root.
  - `threshold?: number | number[]`: Threshold percentage(s) to trigger.
- `tagger`: A function that receives the visibility status (`inView`) and the browser's `IntersectionObserverEntry` and maps them to a TEA `Msg`.
