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
import { describe, expect, it } from 'vitest'

import { addToPrevOverallDataHandler } from '../src/handler'
import { setContainerChangeEvent } from '../src/util'
import {
  type Item,
  fakeContainer,
  item,
  mkConfig,
  openingModel,
} from './fixture'

// A change that keeps the scroll position carries a snapshot of the container
// taken while the old rows are still on screen; the view keeps the position
// with it.

describe('setContainerChangeEvent', () => {
  it('takes the snapshot for a change on top', () => {
    const config = mkConfig()
    config.refs.containerRef.current = fakeContainer(120, 2000)
    const m = setContainerChangeEvent(config.refs, {
      _tag: 'ElementModifyOnTop',
    })(openingModel(null))
    expect(m.containerChangeEvent._tag).toBe('ElementModifyOnTop')
    expect(m.scrollSnapshot).toEqual({ scrollTop: 120, scrollHeight: 2000 })
  })

  it('keeps a snapshot not rendered yet: the container has not changed since', () => {
    const config = mkConfig()
    config.refs.containerRef.current = fakeContainer(120, 2000)
    const first = setContainerChangeEvent(config.refs, {
      _tag: 'ElementModifyOnTop',
    })(openingModel(null))
    config.refs.containerRef.current = fakeContainer(500, 9000)
    const second = setContainerChangeEvent(config.refs, {
      _tag: 'ForceManipulateScrollPos',
    })(first)
    expect(second.scrollSnapshot).toEqual({
      scrollTop: 120,
      scrollHeight: 2000,
    })
  })

  it('clears the snapshot for a change that does not keep the position', () => {
    const config = mkConfig()
    config.refs.containerRef.current = fakeContainer(120, 2000)
    const onTop = setContainerChangeEvent(config.refs, {
      _tag: 'ElementModifyOnTop',
    })(openingModel(null))
    for (const event of [
      { _tag: 'ElementModifyOnBottom' },
      { _tag: 'ElementModifyInPlace' },
      { _tag: 'NoChange' },
    ] as const) {
      expect(
        setContainerChangeEvent(config.refs, event)(onTop).scrollSnapshot,
      ).toBe(null)
    }
  })

  it('takes no snapshot while the list is not mounted', () => {
    const m = setContainerChangeEvent(mkConfig().refs, {
      _tag: 'ElementModifyOnTop',
    })(openingModel(null))
    expect(m.scrollSnapshot).toBe(null)
  })
})

describe('older rows landing on top of a reversed list', () => {
  it('keep the position, with a snapshot', () => {
    const config = mkConfig()
    config.refs.containerRef.current = fakeContainer(0, 1500)
    const m = addToPrevOverallDataHandler<Item, null, never>(
      config,
      openingModel(null),
      [item('older', 1)],
    )
    expect(m.containerChangeEvent._tag).toBe('ElementModifyOnTop')
    expect(m.scrollSnapshot).toEqual({ scrollTop: 0, scrollHeight: 1500 })
  })

  it('change nothing when they are all already loaded', () => {
    const config = mkConfig()
    const loaded = addToPrevOverallDataHandler<Item, null, never>(
      config,
      openingModel(null),
      [item('older', 1)],
    )
    const again = addToPrevOverallDataHandler<Item, null, never>(
      config,
      loaded,
      [item('older', 1)],
    )
    expect(again.containerChangeEvent._tag).toBe('NoChange')
    expect(again.scrollSnapshot).toBe(null)
  })
})
