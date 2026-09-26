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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isInView } from '../src'

class FakeWindow {}

const rect = (top: number, bottom: number) =>
  ({ top, bottom }) as unknown as DOMRect

const fakeElement = (top: number, bottom: number) =>
  ({ getBoundingClientRect: () => rect(top, bottom) }) as unknown as HTMLElement

describe('isInView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('checks against the window viewport', () => {
    vi.stubGlobal('Window', FakeWindow)
    vi.stubGlobal(
      'window',
      Object.assign(new FakeWindow(), { innerHeight: 500 }),
    )

    expect(isInView(fakeElement(100, 200))).toBe(true)
    expect(isInView(fakeElement(600, 700))).toBe(false)
    expect(isInView(fakeElement(600, 700), { margin: 150 })).toBe(true)
  })

  it('checks against a scrolled container in viewport coordinates', () => {
    vi.stubGlobal('Window', FakeWindow)
    vi.stubGlobal(
      'window',
      Object.assign(new FakeWindow(), { innerHeight: 2000 }),
    )

    // Container sits at 1000..1300 on screen and is scrolled down by 800px.
    const container = {
      scrollTop: 800,
      offsetHeight: 300,
      getBoundingClientRect: () => rect(1000, 1300),
    } as unknown as HTMLElement

    // Visible inside the container on screen
    expect(isInView(fakeElement(1100, 1150), { container })).toBe(true)
    // Above the container on screen (would wrongly match the old scrollTop-based bounds)
    expect(isInView(fakeElement(850, 900), { container })).toBe(false)
  })
})
