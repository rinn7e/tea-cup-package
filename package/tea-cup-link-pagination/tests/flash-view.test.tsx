// @vitest-environment jsdom
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
// The highlight of a search result's row (`flash`), drawn: a second
// highlight of the same row within its fade starts the fade again.
import * as SUA from '@rinn7e/tea-cup-prelude/type/sorted-unique-array'
import * as ScrollContainer from '@rinn7e/tea-cup-scroll-container'
import * as S from 'fp-ts/lib/string'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { LinkPaginationMemo } from '../src/component'
import {
  type Config,
  type Flash,
  type Model,
  defaultMode,
  mkRefs,
} from '../src/type'

beforeAll(() => {
  ;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

const mounted: (() => void)[] = []
afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
})

type Item = { id: string }

const eqWithKey = { equals: (a: Item, b: Item) => a.id === b.id }
const ord = {
  equals: eqWithKey.equals,
  compare: (a: Item, b: Item) => S.Ord.compare(a.id, b.id),
}

// Every row drawn: jsdom has no layout, so a virtualized list draws none
const config = {
  logic: {
    refs: mkRefs(),
    isReversed: true,
    ord,
    uniqueKeyField: (item: Item) => item.id,
    scrollContainer: {
      ...ScrollContainer.chatConfig,
      virtualize: { _tag: 'Off' },
    },
  },
  ui: {
    customItemUi: ({ withPrevNextItem }) => (
      <div>{withPrevNextItem.item.id}</div>
    ),
    scrollbarClass: '',
    scrollToLatestCustomUi: null,
    loadingView: null,
  },
} as Config<Item, null, never>

const model = (flash: Flash | null): Model<Item> => ({
  mode: {
    ...defaultMode<Item>(),
    dataSourceId: 'list',
    initial: { _tag: 'Loaded' },
    overallData: SUA.fromArray(eqWithKey, ord)([{ id: 'a' }, { id: 'b' }]),
    next: { _tag: 'Exhausted' },
  },
  flash,
  initialScroll: { _tag: 'Done' },
  scrollContainer: ScrollContainer.init({ _tag: 'AtEnd' }),
})

const render = (first: Model<Item>) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const draw = (m: Model<Item>) =>
    act(() =>
      root.render(
        <LinkPaginationMemo
          itemEq={eqWithKey}
          parentEq={{ equals: () => true }}
          config={config}
          parent={null}
          dispatchParent={() => {}}
          mkParentMsg={(msg) => msg}
          model={m}
        />,
      ),
    )
  draw(first)
  mounted.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  return draw
}

const row = (key: string) => document.getElementById(key)

describe('a highlighted row', () => {
  it('fades while highlighted, and not once the highlight is cleared', () => {
    const draw = render(model({ key: 'b', seq: 1 }))
    expect(row('b')?.classList).toContain('bg-fade-out')
    expect(row('a')?.classList).not.toContain('bg-fade-out')
    draw(model(null))
    expect(row('b')?.classList).not.toContain('bg-fade-out')
  })

  it('starts the fade again when it is highlighted again', () => {
    // Only `seq` changes: the same element would keep the fade it is in
    const draw = render(model({ key: 'b', seq: 1 }))
    const first = row('b')
    draw(model({ key: 'b', seq: 2 }))
    const second = row('b')
    expect(second?.classList).toContain('bg-fade-out')
    expect(second).not.toBe(first)
  })
})
