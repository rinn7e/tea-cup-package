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
// The change to the rows that the view still has to apply is one field,
// `pendingChange`, with its snapshot inside the change that needs it, so a
// snapshot can't be left without a change, or a change on top without one.
import type * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import { describe, expect, it } from 'vitest'

import { mapFuncHandler, replaceFuncHandler } from '../src/handler'
import { addToPrevOverallDataHandler } from '../src/handler'
import { type LogicConfig, type Model, defaultMode, mkRefs } from '../src/type'
import { update } from '../src/update'
import {
  keepPendingChange,
  setContainerChangeEvent,
  setOrKeepContainerChangeEvent,
} from '../src/util'
import {
  type Item as ListItem,
  fakeContainer,
  item,
  mkConfig,
  openingModel,
} from './fixture'

type Item = { id: string }

const model = (): Model<Item> => ({
  mode: defaultMode<Item>(),
  pendingChange: { _tag: 'None' },
  invisWhileScrolling: false,
  isScrolling: false,
  initialScroll: { _tag: 'Done' },
})

// Refs with a container at the given position.
const refsAt = (scrollTop: number, scrollHeight: number) => {
  const refs = mkRefs()
  refs.containerRef.current = { scrollTop, scrollHeight } as HTMLDivElement
  return refs
}

describe('setting a change', () => {
  it('on top keeps the position, with the container as it is now', () => {
    const after = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'ElementModifyOnTop',
    })(model())
    expect(after.pendingChange).toEqual({
      _tag: 'KeepPosition',
      before: { scrollTop: 100, scrollHeight: 1000 },
    })
    const forced = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'ForceManipulateScrollPos',
    })(model())
    expect(forced.pendingChange._tag).toBe('KeepPosition')
  })

  it('on top keeps the snapshot of a change not rendered yet', () => {
    const first = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'ElementModifyOnTop',
    })(model())
    const second = setContainerChangeEvent(refsAt(400, 1600), {
      _tag: 'ElementModifyOnTop',
    })(first)
    expect(second.pendingChange).toEqual({
      _tag: 'KeepPosition',
      before: { scrollTop: 100, scrollHeight: 1000 },
    })
  })

  it('below or in place only records the position', () => {
    for (const _tag of [
      'ElementModifyOnBottom',
      'ElementModifyInPlace',
    ] as const) {
      const after = setContainerChangeEvent(refsAt(100, 1000), { _tag })(
        model(),
      )
      expect(after.pendingChange).toEqual({ _tag: 'RecordPosition' })
    }
  })

  it('NoChange clears it, with its snapshot', () => {
    const onTop = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'ElementModifyOnTop',
    })(model())
    const cleared = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'NoChange',
    })(onTop)
    expect(cleared.pendingChange).toEqual({ _tag: 'None' })
  })

  it('on top before the list is mounted has no snapshot', () => {
    const after = setContainerChangeEvent(mkRefs(), {
      _tag: 'ElementModifyOnTop',
    })(model())
    expect(after.pendingChange).toEqual({ _tag: 'KeepPosition', before: null })
  })
})

describe('a change that does not say where it lands', () => {
  it('keeps the pending one', () => {
    const recorded = setContainerChangeEvent(refsAt(100, 1000), {
      _tag: 'ElementModifyInPlace',
    })(model())
    expect(
      setOrKeepContainerChangeEvent(refsAt(5, 50), undefined)(recorded),
    ).toBe(recorded)
  })

  it('gives a change on top without a snapshot the one it can take now', () => {
    const unmounted = setContainerChangeEvent(mkRefs(), {
      _tag: 'ElementModifyOnTop',
    })(model())
    expect(
      keepPendingChange(refsAt(100, 1000))(unmounted).pendingChange,
    ).toEqual({
      _tag: 'KeepPosition',
      before: { scrollTop: 100, scrollHeight: 1000 },
    })
  })
})

describe('ReplaceFunc and MapFunc', () => {
  const config = {
    refs: refsAt(100, 1000),
    isReversed: true,
    ord: {
      equals: (a: Item, b: Item) => a.id === b.id,
      compare: (a: Item, b: Item) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    },
    uniqueKeyField: (item: Item) => item.id,
  } as unknown as LogicConfig<Item, unknown, never>

  it('calling the handler sets the change, as sending the message does', () => {
    const msg = {
      func: (items: SUA.SortedUniqueArray<Item>) =>
        [items, null] as [SUA.SortedUniqueArray<Item>, null],
      containerChangeEvent: { _tag: 'ElementModifyOnTop' } as const,
    }
    const [byHandler, routeByHandler] = replaceFuncHandler(config, model(), msg)
    const [byMessage, , routeByMessage] = update<Item, unknown, never, never>(
      true,
      config,
    )(null, { _tag: 'ReplaceFunc', ...msg }, model())
    expect(byHandler.pendingChange).toEqual({
      _tag: 'KeepPosition',
      before: { scrollTop: 100, scrollHeight: 1000 },
    })
    expect(byMessage.pendingChange).toEqual(byHandler.pendingChange)
    expect(routeByHandler).toBeNull()
    expect(routeByMessage).toBeNull()
  })

  it('MapFunc is ReplaceFunc over each item: it keeps the pending change without an event', () => {
    const pending = setContainerChangeEvent(refsAt(5, 50), {
      _tag: 'ElementModifyInPlace',
    })(model())
    expect(
      mapFuncHandler(config, pending, { func: (i) => i }).pendingChange,
    ).toEqual({ _tag: 'RecordPosition' })
  })
})

describe('older rows landing on top of a reversed list', () => {
  it('keep the position, with a snapshot', () => {
    const config = mkConfig()
    config.refs.containerRef.current = fakeContainer(0, 1500)
    const m = addToPrevOverallDataHandler<ListItem, null, never>(
      config,
      openingModel(null),
      [item('older', 1)],
    )
    expect(m.pendingChange).toEqual({
      _tag: 'KeepPosition',
      before: { scrollTop: 0, scrollHeight: 1500 },
    })
  })

  it('change nothing when they are all already loaded', () => {
    const config = mkConfig()
    const loaded = addToPrevOverallDataHandler<ListItem, null, never>(
      config,
      openingModel(null),
      [item('older', 1)],
    )
    const again = addToPrevOverallDataHandler<ListItem, null, never>(
      config,
      loaded,
      [item('older', 1)],
    )
    expect(again.pendingChange).toEqual({ _tag: 'None' })
  })
})
