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
// A list's reading position is kept in one place, the `ScrollStateMap` in an
// `IORef`, as an
// anchor: the first item in view and its top. Restoring it lands on the same
// item after rows above it changed, which a stored `scrollTop` didn't.
import * as O from 'fp-ts/lib/Option'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  newScrollStateRef,
  readScrollAnchor,
  restoreScrollState,
  storeScrollState,
} from '../src/common/type/scroll-state-map'
import { emptyModel, restoreSavedScroll, setSelectedKey } from '../src/helper'
import {
  type Edge,
  type LogicConfig,
  defaultDataSourceIdAttribute,
  defaultMode,
  mkRefs,
} from '../src/type'

beforeAll(() => {
  // Node has no `CSS`; the keys here need no escaping
  ;(globalThis as { CSS?: unknown }).CSS ??= { escape: (s: string) => s }
})

const dataSourceId = 'list'

type Box = { top: number; bottom: number; height: number }

const box = (top: number, height: number): Box => ({
  top,
  bottom: top + height,
  height,
})

// A container showing 0–300 px, with rows of the given ids and heights
// stacked from `firstTop`.
const container = (
  rows: { id: string; height: number }[],
  firstTop: number,
  scrollTop = 1000,
) => {
  const rowEls = rows.reduce<{ els: unknown[]; top: number }>(
    (acc, row) => ({
      els: [
        ...acc.els,
        {
          id: row.id,
          getBoundingClientRect: () => box(acc.top, row.height),
        },
      ],
      top: acc.top + row.height,
    }),
    { els: [], top: firstTop },
  ).els
  const el = {
    scrollTop,
    scrollHeight: 5000,
    clientHeight: 300,
    getBoundingClientRect: () => box(0, 300),
    querySelectorAll: (selector: string) =>
      selector.includes(`${defaultDataSourceIdAttribute}="${dataSourceId}"`)
        ? rowEls
        : [],
    querySelector: (selector: string) =>
      rowEls.find((row) => `#${(row as { id: string }).id}` === selector) ??
      null,
    scrollTo: ({ top }: { top: number }) => {
      el.scrollTop = top
    },
  }
  return el
}

const asDiv = (el: unknown) => el as HTMLDivElement

describe('the reading position', () => {
  it('is the first item mostly in view, with its top', () => {
    // `a` shows 10 of its 100 px (10%), `b` is the first one in view
    const el = container(
      [
        { id: 'a', height: 100 },
        { id: 'b', height: 100 },
      ],
      -90,
    )
    expect(readScrollAnchor(dataSourceId, asDiv(el))()).toEqual(
      O.some({ key: 'b', top: 10 }),
    )
  })

  it('counts an item with 15% in view', () => {
    const el = container([{ id: 'a', height: 100 }], -85)
    expect(readScrollAnchor(dataSourceId, asDiv(el))()).toEqual(
      O.some({ key: 'a', top: -85 }),
    )
  })

  it('is stored per data source', () => {
    const ref = newScrollStateRef()
    const store = storeScrollState(ref)(
      dataSourceId,
      asDiv(container([{ id: 'a', height: 100 }], 20)),
    )
    // Nothing is stored until the effect runs
    expect(ref.read().size).toBe(0)
    store()
    expect(ref.read().get(dataSourceId)).toEqual({ key: 'a', top: 20 })
    expect(ref.read().get('other')).toBeUndefined()
  })

  it('is restored onto the same item after rows above it changed', () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'b', top: 10 }]]))()
    // Rows were added above: `b` is now 400 px further down
    const el = container(
      [
        { id: 'new', height: 400 },
        { id: 'a', height: 100 },
        { id: 'b', height: 100 },
      ],
      -90,
    )
    restoreScrollState(ref)(dataSourceId, asDiv(el))()
    // `b` was at 410: scrolling 400 px puts it back at 10
    expect(el.scrollTop).toBe(1400)
  })

  it('is not restored when the item is gone', () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'gone', top: 10 }]]))()
    const el = container([{ id: 'a', height: 100 }], 0)
    restoreScrollState(ref)(dataSourceId, asDiv(el))()
    expect(el.scrollTop).toBe(1000)
  })
})

describe('restoring a list shown again', () => {
  const config = {
    refs: mkRefs(),
    uniqueKeyField: (item: { id: string }) => item.id,
  } as unknown as LogicConfig<{ id: string }, unknown, never>

  const exhausted: Edge = { _tag: 'Exhausted' }
  const model = setSelectedKey('a')(
    emptyModel({
      ...defaultMode<{ id: string }>(),
      dataSourceId,
      prev: exhausted,
      next: exhausted,
    }),
  )

  it('hides the list until it is back at its position', () => {
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'a', top: 0 }]]))()
    const [after] = restoreSavedScroll(config, ref, { resetEdges: false })(
      model,
    )
    expect(after.visibility).toEqual({ _tag: 'HiddenForRestore' })
    expect(after.mode.selectedKey).toBe('a')
  })

  it('does nothing without a stored position', () => {
    const [after] = restoreSavedScroll(config, newScrollStateRef(), {
      resetEdges: false,
    })(model)
    expect(after).toEqual(model)
  })

  it('drops a change pending while the list was away', () => {
    // Its snapshot is of the container as it was then (or of another list)
    const ref = newScrollStateRef()
    ref.write(new Map([[dataSourceId, { key: 'a', top: 0 }]]))()
    const [after] = restoreSavedScroll(config, ref, { resetEdges: false })({
      ...model,
      pendingChange: {
        _tag: 'KeepPosition',
        before: { scrollTop: 900, scrollHeight: 5000 },
      },
    })
    expect(after.pendingChange).toEqual({ _tag: 'None' })
  })

  it('reopens the ends only when asked', () => {
    const ref = newScrollStateRef()
    const [reset] = restoreSavedScroll(config, ref, { resetEdges: true })(model)
    expect(reset.mode.prev).toEqual({ _tag: 'Idle' })
    expect(reset.mode.next).toEqual({ _tag: 'Idle' })
    const [kept] = restoreSavedScroll(config, ref, { resetEdges: false })(model)
    expect(kept.mode.next).toEqual(exhausted)
  })
})
