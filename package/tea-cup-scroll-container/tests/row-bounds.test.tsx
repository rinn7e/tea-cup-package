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
// Where a row is, for readers outside the view (`rowBounds`, the "first
// unread" button): from its DOM when it is drawn, from the engine's layout
// otherwise. jsdom has no layout: a virtualized list draws no row (no view
// height), and a row drawn is placed by a stubbed `getBoundingClientRect`.
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import * as SC from '../src'
import { ScrollContainer, rowBounds } from '../src/component'

beforeAll(() => {
  ;(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

const mounted: (() => void)[] = []
afterEach(() => {
  mounted.splice(0).forEach((unmount) => unmount())
})

// Renders a list of `count` rows (`m0`, `m1`...), and returns its scroll
// element
const render = (config: SC.Config, count: number): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() =>
    root.render(
      <ScrollContainer
        model={SC.init({ _tag: 'AtEnd' })}
        config={config}
        count={count}
        getKey={(i) => `m${i}`}
        renderRow={(i) => <div>message {i}</div>}
        header={null}
        footer={null}
        containerRef={{ current: null }}
        className=''
        dispatch={() => {}}
      />,
    ),
  )
  mounted.push(() => {
    act(() => root.unmount())
    host.remove()
  })
  return host.querySelector<HTMLElement>('[data-component=ScrollContainer]')!
}

const rect = (top: number, bottom: number) =>
  ({
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
  }) as DOMRect

describe('where a row is (rowBounds)', () => {
  it("gives a row not drawn where the engine's layout places it", () => {
    // Virtualized: no row is drawn, each counts at its estimated size. More
    // rows than a list measures as it opens (a page), so none is measured
    const list = render(SC.chatConfig, 40)
    expect(list.querySelectorAll('[data-index]')).toHaveLength(0)
    const size =
      SC.chatConfig.virtualize._tag === 'On'
        ? SC.chatConfig.virtualize.estimateSize
        : 0
    expect(rowBounds(list, 'm2')).toEqual({ top: 2 * size, bottom: 3 * size })
    // From the top of the view: the offset scrolled is taken off
    list.scrollTop = 500
    expect(rowBounds(list, 'm2')).toEqual({
      top: 2 * size - 500,
      bottom: 3 * size - 500,
    })
  })

  it('gives a row drawn where its DOM is, from the top of the view', () => {
    const list = render({ ...SC.chatConfig, virtualize: { _tag: 'Off' } }, 3)
    const row = list.querySelector<HTMLElement>('[data-index="1"]')!
    list.getBoundingClientRect = () => rect(100, 700)
    row.getBoundingClientRect = () => rect(250, 330)
    expect(rowBounds(list, 'm1')).toEqual({ top: 150, bottom: 230 })
  })

  it('gives nothing for a row the list does not have', () => {
    const list = render(SC.chatConfig, 3)
    expect(rowBounds(list, 'm9')).toBeNull()
  })

  it('gives nothing for an element no list is on', () => {
    expect(rowBounds(document.createElement('div'), 'm1')).toBeNull()
  })
})
