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

import {
  apiLegShouldScroll,
  cacheLegShouldScroll,
  targetIsProvisional,
} from '../src/initial-scroll'

describe('initial scroll', () => {
  it('a selected key is provisional until the API answers', () => {
    expect(targetIsProvisional('item-1')).toBe(true)
    expect(targetIsProvisional(null)).toBe(false)
  })

  it('the cache leg scrolls only to the newest page, once, with rows', () => {
    const base = { initialScrollDone: false, hasCacheData: true }
    expect(cacheLegShouldScroll({ ...base, selectedKey: null })).toBe(true)
    expect(cacheLegShouldScroll({ ...base, selectedKey: 'item-1' })).toBe(false)
    expect(
      cacheLegShouldScroll({ ...base, hasCacheData: false, selectedKey: null }),
    ).toBe(false)
    expect(
      cacheLegShouldScroll({
        ...base,
        initialScrollDone: true,
        selectedKey: null,
      }),
    ).toBe(false)
  })

  it('the API leg scrolls whenever the scroll is still owed', () => {
    expect(apiLegShouldScroll({ initialScrollDone: false })).toBe(true)
    expect(apiLegShouldScroll({ initialScrollDone: true })).toBe(false)
  })
})
