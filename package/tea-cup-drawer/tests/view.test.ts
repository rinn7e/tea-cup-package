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
import { type MouseEvent, type PointerEvent, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Drawer from '../src'
import { contentAttrs, defaultHandleView, drawerHandleView } from '../src/view'

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
        'data-drawer-handle': 'bottom',
        'aria-hidden': 'true',
        onClick: () => {},
      },
      className: 'mine',
      children: null,
    })
    expect(handle.type).toBe(expected.type)
    expect(handle.props.className).toBe(expected.props.className)
    expect(handle.props['data-drawer-handle']).toBe('bottom')
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
    expect(arg.attrs['data-drawer-handle']).toBe('bottom')
    expect(arg.attrs['aria-hidden']).toBe('true')
    expect(
      (arg.children as { props: Record<string, unknown> }).props,
    ).toHaveProperty('data-drawer-handle-hitarea', '')
    // A tap moves to the next snap point
    arg.attrs.onClick()
    expect(dispatched).toEqual([{ _tag: 'CycleSnap' }])
  })
})

// The tests run without a DOM: just enough of one for the content's handlers
class FakeNode {}
class FakeElement extends FakeNode {
  closest() {
    return null
  }
}

describe('contentAttrs — click after a drag', () => {
  beforeEach(() => {
    vi.stubGlobal('Node', FakeNode)
    vi.stubGlobal('Element', FakeElement)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const visible = (swallowNextClick: boolean): Drawer.Model<null> => ({
    ...Drawer.defaultModel(config()),
    animate: { _tag: 'Visible', internal: null, gesture: { _tag: 'Idle' } },
    swallowNextClick,
  })

  const dragging: Drawer.Model<null> = {
    ...Drawer.defaultModel(config()),
    animate: {
      _tag: 'Dragging',
      internal: null,
      press: {
        pointerType: 'mouse',
        startX: 0,
        startY: 0,
        startedAt: 0,
        startDistance: 0,
        size: 100,
        viewport: 100,
        isNoDragTarget: false,
        scrollerTakesGesture: false,
      },
      distance: 40,
      last: { x: 0, y: 40 },
    },
  }

  const inside = new FakeElement()
  const content = { contains: (node: unknown) => node === inside }

  // Clicks the content's capture handler; true when the click was stopped
  const click = (
    model: Drawer.Model<null>,
    over: { detail?: number; target?: unknown } = {},
  ): boolean => {
    let stopped = false
    contentAttrs(model, () => {}).onClickCapture({
      detail: over.detail ?? 1,
      target: over.target ?? inside,
      currentTarget: content,
      preventDefault: () => {},
      stopPropagation: () => {
        stopped = true
      },
    } as unknown as MouseEvent<HTMLElement>)
    return stopped
  }

  it('lets a tap through', () => {
    expect(click(visible(false))).toBe(false)
  })

  it('stops the click of a released drag', () => {
    expect(click(visible(true))).toBe(true)
  })

  it('stops a click that comes before the release is rendered', () => {
    expect(click(dragging)).toBe(true)
  })

  it('lets a click from the keyboard through', () => {
    expect(click(visible(true), { detail: 0 })).toBe(false)
  })

  it('lets a click from a portal inside the content through', () => {
    expect(click(visible(true), { target: new FakeElement() })).toBe(false)
  })

  // Presses the content with a button the drawer doesn't drag with
  const pressIgnored = (model: Drawer.Model<null>): Drawer.Msg<null>[] => {
    const dispatched: Drawer.Msg<null>[] = []
    contentAttrs(model, (m) => dispatched.push(m)).onPointerDown({
      button: 2,
      isPrimary: true,
      target: inside,
      currentTarget: content,
    } as unknown as PointerEvent<HTMLElement>)
    return dispatched
  }

  it('lets the click of an ignored press through again', () => {
    expect(pressIgnored(visible(true))).toEqual([{ _tag: 'PressIgnored' }])
  })

  it('sends nothing for an ignored press when nothing is swallowed', () => {
    expect(pressIgnored(visible(false))).toEqual([])
  })
})

describe('contentAttrs — no native scroll during a drag', () => {
  type TouchMoveListener = (e: {
    cancelable: boolean
    preventDefault: () => void
  }) => void

  // The content element, with what the ref attached to it
  const element = (state: string) => {
    const listeners: { listener: TouchMoveListener; options: unknown }[] = []
    return {
      listeners,
      dataset: { state },
      addEventListener: (
        type: string,
        listener: TouchMoveListener,
        options: unknown,
      ) => {
        if (type === 'touchmove') {
          listeners.push({ listener, options })
        } else {
          // Not the one under test
        }
      },
      removeEventListener: (type: string, listener: TouchMoveListener) => {
        const i = listeners.findIndex((l) => l.listener === listener)
        if (type === 'touchmove' && i >= 0) {
          listeners.splice(i, 1)
        } else {
          // Not attached
        }
      },
    }
  }

  const attach = (state: string) => {
    const el = element(state)
    const ref = contentAttrs(Drawer.defaultModel(config()), () => {}).ref
    const cleanup = ref(el as unknown as HTMLElement)
    return { el, cleanup }
  }

  // Sends a touch move to the element; true when it was cancelled
  const touchMove = (el: ReturnType<typeof element>): boolean => {
    let prevented = false
    el.listeners.forEach(({ listener }) =>
      listener({
        cancelable: true,
        preventDefault: () => {
          prevented = true
        },
      }),
    )
    return prevented
  }

  it('attaches one listener that may cancel (not passive)', () => {
    const { el } = attach('Visible')
    expect(el.listeners).toHaveLength(1)
    expect(el.listeners[0].options).toEqual({ passive: false })
  })

  it('lets the content scroll at rest', () => {
    expect(touchMove(attach('Visible').el)).toBe(false)
  })

  it('cancels the touch moves while dragging', () => {
    const { el } = attach('Visible')
    el.dataset.state = 'Dragging'
    expect(touchMove(el)).toBe(true)
  })

  it('detaches the listener with the element', () => {
    const { el, cleanup } = attach('Dragging')
    cleanup?.()
    expect(el.listeners).toHaveLength(0)
  })

  it('keeps the same ref across renders, so it is attached once', () => {
    const model = Drawer.defaultModel(config())
    expect(contentAttrs(model, () => {}).ref).toBe(
      contentAttrs(model, () => {}).ref,
    )
  })
})
