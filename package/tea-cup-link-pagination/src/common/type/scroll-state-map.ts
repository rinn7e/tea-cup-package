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
import * as A from 'fp-ts/lib/Array'
import * as IO from 'fp-ts/lib/IO'
import { type IORef, newIORef } from 'fp-ts/lib/IORef'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import * as RM from 'fp-ts/lib/ReadonlyMap'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'

import {
  type ShouldRestoreScrollStateArg,
  defaultDataSourceIdAttribute,
} from '../../type'

// Where the user reads, per data source: the first item in view (`key`) and
// its top, from the container's top edge (negative when it starts above).
// Kept by the item, not by `scrollTop`, so a restore lands on the same item
// after rows above it changed.
export type ScrollAnchor = { key: string; top: number }

// The reading position of each list, by `dataSourceId`. A value: it changes
// only through the `IORef` that holds it (`newScrollStateRef`).
export type ScrollStateMap = ReadonlyMap<string, ScrollAnchor>

// The cell an owner keeps its lists' positions in. It lives outside the model:
// it is written on every scroll, which mustn't re-render the list.
export const newScrollStateRef: IO.IO<IORef<ScrollStateMap>> = newIORef(
  new Map<string, ScrollAnchor>(),
)

// The share of an item that must be in view for it to count as the first one.
const anchorVisibleShare = 0.15

// The first item of `dataSourceId` in view in `container`, with its top.
export const readScrollAnchor =
  (
    dataSourceId: string,
    container: HTMLDivElement,
  ): IO.IO<Option<ScrollAnchor>> =>
  () => {
    const box = container.getBoundingClientRect()
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>(
        `:scope .custom-ui-wrapper[${defaultDataSourceIdAttribute}="${CSS.escape(dataSourceId)}"]`,
      ),
    )
    return pipe(
      rows,
      A.findFirstMap((row) => {
        const rect = row.getBoundingClientRect()
        const shown =
          Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top)
        return rect.height > 0 && shown / rect.height >= anchorVisibleShare
          ? O.some({ key: row.id, top: rect.top - box.top })
          : O.none
      }),
    )
  }

// Keep the position `container` shows for `dataSourceId`.
export const storeScrollState =
  (ref: IORef<ScrollStateMap>) =>
  (dataSourceId: string, container: HTMLDivElement): IO.IO<void> =>
    pipe(
      readScrollAnchor(dataSourceId, container),
      IO.chain(
        O.fold(
          () => IO.of(undefined),
          (anchor) =>
            ref.modify(RM.upsertAt(S.Eq)<ScrollAnchor>(dataSourceId, anchor)),
        ),
      ),
    )

// Scroll `container` so the stored item is at its stored top. Nothing happens
// when the item isn't rendered, or the container can't scroll.
export const restoreScrollState =
  (ref: IORef<ScrollStateMap>) =>
  (dataSourceId: string, container: HTMLDivElement): IO.IO<void> =>
  () =>
    pipe(
      RM.lookup(S.Eq)(dataSourceId)(ref.read()),
      O.chain((anchor) =>
        pipe(
          O.fromNullable(
            container.querySelector<HTMLElement>(`#${CSS.escape(anchor.key)}`),
          ),
          O.map((row) => ({ anchor, row })),
        ),
      ),
      O.filter(() => container.scrollHeight > container.clientHeight),
      O.map(({ anchor, row }) => {
        const top =
          row.getBoundingClientRect().top -
          container.getBoundingClientRect().top
        container.scrollTo({ top: container.scrollTop + top - anchor.top })
      }),
    )

export const mkShouldRestoreScrollState = (
  dataSourceId: string,
  ref: IORef<ScrollStateMap>,
): ShouldRestoreScrollStateArg => ({
  checkShouldRestore: () =>
    RM.member(S.Eq)(dataSourceId)(ref.read())
      ? { _tag: 'ScrollState' }
      : { _tag: 'NoOp' },
  restore: restoreScrollState(ref),
})
