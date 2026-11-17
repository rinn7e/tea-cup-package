/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import type * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import type * as IO from 'fp-ts/lib/IO'
import { type IORef, newIORef } from 'fp-ts/lib/IORef'
import * as RM from 'fp-ts/lib/ReadonlyMap'
import * as S from 'fp-ts/lib/string'

// Where the user reads, per data source: the row at the top of the view
// (`key`, the row covering its top edge) and its top, from the container's
// top edge (negative when it starts above). Kept by the item, not by
// `scrollTop`, so a restore lands on the same item after rows above it
// changed.
export type ScrollAnchor = { key: string; top: number }

// The reading position of each list, by `dataSourceId`. A value: it changes
// only through the `IORef` that holds it (`newScrollStateRef`).
export type ScrollStateMap = ReadonlyMap<string, ScrollAnchor>

// The cell an owner keeps its lists' positions in. It lives outside the model:
// it is written on every scroll, which mustn't re-render the list.
export const newScrollStateRef: IO.IO<IORef<ScrollStateMap>> = newIORef(
  new Map<string, ScrollAnchor>(),
)

// Keep `anchor`, the row the scroll container reports at the top of the
// view of `dataSourceId` (its `onAnchor`), as that list's position.
export const storeScrollState =
  (ref: IORef<ScrollStateMap>) =>
  (dataSourceId: string, anchor: ScrollContainer.Anchor): IO.IO<void> =>
    ref.modify(
      RM.upsertAt(S.Eq)<ScrollAnchor>(dataSourceId, {
        key: anchor.key,
        top: anchor.offset,
      }),
    )
