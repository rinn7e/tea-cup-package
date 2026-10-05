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
import * as O from 'fp-ts/lib/Option'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import * as Drawer from '../src'
import { defaultHandleView, drawerHandleView } from '../src/view'

const aria: Drawer.AriaConfig = {
  label: { _tag: 'Text', value: 'Test' },
  describedBy: O.none,
}

const config = (
  over: Partial<Drawer.Config<null>> = {},
): Drawer.Config<null> => ({
  ...Drawer.defaultConfig<null>('test', () => 'test', aria),
  ...over,
})

describe('defaultConfig — ui', () => {
  it('leaves the views to the package when unset', () => {
    expect(Drawer.defaultConfig<null>('test', () => 'test', aria).ui).toBe(
      undefined,
    )
  })

  it('keeps the given views', () => {
    const ui: Drawer.Ui = { handle: () => createElement('i') }
    expect(Drawer.defaultConfig<null>('test', () => 'test', aria, ui).ui).toBe(
      ui,
    )
  })
})

describe('drawerHandleView', () => {
  it('renders the package handle when the config has none', () => {
    const dispatched: Drawer.Msg<null>[] = []
    const handle = drawerHandleView(config(), (m) => dispatched.push(m), 'mine')
    const expected = defaultHandleView({
      attrs: {
        'data-drawer-handle': '',
        'aria-hidden': 'true',
        onClick: () => {},
      },
      className: 'mine',
      children: null,
    })
    expect(handle.type).toBe(expected.type)
    expect(handle.props.className).toBe(expected.props.className)
    expect(handle.props['data-drawer-handle']).toBe('')
  })

  it('renders the config’s handle with the attributes, class and hit area', () => {
    const args: Drawer.HandleUiArg[] = []
    const custom = createElement('i')
    const dispatched: Drawer.Msg<null>[] = []
    const handle = drawerHandleView(
      config({
        ui: {
          handle: (arg) => {
            args.push(arg)
            return custom
          },
        },
      }),
      (m) => dispatched.push(m),
      'mine',
    )
    expect(handle).toBe(custom)
    expect(args).toHaveLength(1)
    const [arg] = args
    expect(arg.className).toBe('mine')
    expect(arg.attrs['data-drawer-handle']).toBe('')
    expect(arg.attrs['aria-hidden']).toBe('true')
    expect(
      (arg.children as { props: Record<string, unknown> }).props,
    ).toHaveProperty('data-drawer-handle-hitarea', '')
    // A tap moves to the next snap point
    arg.attrs.onClick()
    expect(dispatched).toEqual([{ _tag: 'CycleSnap' }])
  })
})
