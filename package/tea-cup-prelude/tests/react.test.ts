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
import { act, render, renderHook } from '@testing-library/react'
import React from 'react'
import { Cmd } from 'tea-cup-fp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { devTools, memoStrategy, useDebouncedCallback } from '../src'

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the callback once, after the delay, with the latest args', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('a')
      result.current('b')
      result.current('c')
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('c')
  })

  it('invokes the latest callback passed on re-render', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 100),
      { initialProps: { cb: first } },
    )

    act(() => {
      result.current()
    })
    rerender({ cb: second })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('uses the new delay after it changes', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 100 } },
    )

    rerender({ delay: 500 })
    act(() => {
      result.current()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not call the callback after unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 100),
    )

    act(() => {
      result.current()
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('memoStrategy', () => {
  type Props = { value: number; label: string }

  const setup = (equals: (prev: Props, next: Props) => boolean) => {
    const renders: Props[] = []
    const Component = (props: Props) => {
      renders.push(props)
      return React.createElement('span', null, `${props.label}:${props.value}`)
    }
    const Memo = memoStrategy(Component, equals)
    return { renders, Memo }
  }

  it('skips re-rendering when `equals` says the props are equal', () => {
    // Only `value` matters for equality
    const { renders, Memo } = setup((a, b) => a.value === b.value)
    const { rerender, container } = render(
      React.createElement(Memo, { value: 1, label: 'a' }),
    )
    rerender(React.createElement(Memo, { value: 1, label: 'b' }))

    expect(renders).toHaveLength(1)
    expect(container.textContent).toBe('a:1')
  })

  it('re-renders when `equals` says the props differ', () => {
    const { renders, Memo } = setup((a, b) => a.value === b.value)
    const { rerender, container } = render(
      React.createElement(Memo, { value: 1, label: 'a' }),
    )
    rerender(React.createElement(Memo, { value: 2, label: 'a' }))

    expect(renders).toHaveLength(2)
    expect(container.textContent).toBe('a:2')
  })
})

describe('devTools', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers itself on window and logs the innermost subMsg of updates', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const tools = devTools<number, unknown>()

    expect((window as unknown as Record<string, unknown>).teaCupDevTools).toBe(
      tools,
    )

    const { listener } = tools.getProgramProps()
    expect(listener).toBeDefined()
    const leaf = { _tag: 'ChangeContent', text: 'hi' }
    listener?.({
      tag: 'update',
      count: 1,
      msg: { _tag: 'PageMsg', subMsg: { _tag: 'EditorMsg', subMsg: leaf } },
      mac: [2, Cmd.none()],
    })

    expect(log).toHaveBeenLastCalledWith('🍵', 1, 'update', leaf, 2, Cmd.none())
    expect(tools.events).toHaveLength(1)
  })
})
