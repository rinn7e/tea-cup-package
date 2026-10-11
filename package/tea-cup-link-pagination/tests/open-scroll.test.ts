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
// The open's scroll: the list stays hidden until the scroll to its current
// target is done, and a reader who scrolled the cached rows isn't pulled back.
import * as E from 'fp-ts/lib/Either'
import { describe, expect, it } from 'vitest'

import { getInitialDataFromApiResponseHandler } from '../src/handler'
import { setSelectedKey } from '../src/helper'
import {
  type LogicConfig,
  type Model,
  type Msg,
  type Visibility,
  defaultMode,
  mkRefs,
} from '../src/type'
import { update } from '../src/update'

type Item = { id: string }

const dataSourceId = 'test-list'

const config = {
  refs: mkRefs(),
  isReversed: true,
  ord: {
    equals: (a: Item, b: Item) => a.id === b.id,
    compare: (a: Item, b: Item) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  },
  uniqueKeyField: (item: Item) => item.id,
} as unknown as LogicConfig<Item, unknown, never>

const model = (m: Partial<Model<Item>>): Model<Item> => ({
  mode: { ...defaultMode<Item>(), dataSourceId, initial: { _tag: 'Cached' } },
  pendingChange: { _tag: 'None' },
  visibility: { _tag: 'Visible' },
  isScrolling: false,
  initialScroll: { _tag: 'Done' },
  ...m,
})

const send = (msg: Msg<Item, never, never>, m: Model<Item>) =>
  update<Item, unknown, never, never>(true, config)(null, msg, m)[0]

// The list hidden by a scroll is shown again by that scroll's end, and only
// by it (see `Visibility`).
describe('a finished scroll', () => {
  const visible: Visibility = { _tag: 'Visible' }
  // Hidden by the scroll to `key`, its current target
  const hiddenFor = (key: string): Model<Item> =>
    model({
      mode: { ...model({}).mode, selectedKey: key },
      visibility: { _tag: 'HiddenForScroll', key },
    })
  const done = (selectedKey: string, m: Model<Item>) =>
    send(
      {
        _tag: 'ScrollToCurrentDone',
        dataSourceId,
        selectedKey,
      },
      m,
    ).visibility

  it('shows the list when it is the scroll that hid it', () => {
    expect(done('target', hiddenFor('target'))).toEqual(visible)
  })

  // Before, any finished scroll showed the list: a scroll to the cached
  // target finishing after the API moved the target showed it before the
  // newer scroll was done.
  it('does not when a newer hidden scroll replaced it', () => {
    const moved = hiddenFor('moved')
    expect(done('cached', moved)).toEqual(moved.visibility)
  })

  // Comparing with `selectedKey` instead, a target changed without a new
  // scroll (an owner calling `setSelectedKey`) left the list hidden
  // for good.
  it('shows the list when the target changed without a new scroll', () => {
    expect(
      done('target', setSelectedKey('other')(hiddenFor('target'))),
    ).toEqual(visible)
  })

  it("a restore's end doesn't show the list a scroll hid since", () => {
    const hidden = hiddenFor('target')
    expect(
      send({ _tag: 'RestoreDone', dataSourceId }, hidden).visibility,
    ).toEqual(hidden.visibility)
  })
})

// Before, when the API changed the rows around the cached target, the list
// scrolled back to it, even when the reader had scrolled away meanwhile.
describe('a reader scrolling the cached rows', () => {
  const fromCache = model({
    mode: {
      ...model({}).mode,
      selectedKey: 'b',
      overallData: {
        value: [{ id: 'b' }],
      } as Model<Item>['mode']['overallData'],
    },
    initialScroll: { _tag: 'FromCache', key: 'b' },
  })

  it('ends the open', () => {
    expect(send({ _tag: 'ReaderScrolled' }, fromCache).initialScroll).toEqual({
      _tag: 'Done',
    })
  })

  it('is not pulled back when the API changes the rows', () => {
    const read = send({ _tag: 'ReaderScrolled' }, fromCache)
    const [answered] = getInitialDataFromApiResponseHandler(
      config,
      dataSourceId,
      E.right({ dataF: () => [{ id: 'a' }, { id: 'b' }], nextIsMax: true }),
      read,
    )
    expect(answered.isScrolling).toBe(false)
    expect(answered.visibility).toEqual({ _tag: 'Visible' })
  })

  it('changes nothing once the open is done', () => {
    const opened = model({})
    expect(send({ _tag: 'ReaderScrolled' }, opened)).toBe(opened)
  })
})
