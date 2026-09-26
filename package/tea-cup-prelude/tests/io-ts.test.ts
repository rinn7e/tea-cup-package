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
import * as E from 'fp-ts/lib/Either'
import * as t from 'io-ts'
import { describe, expect, it } from 'vitest'

import { withDefault } from '../src'

describe('withDefault', () => {
  const codec = withDefault(t.number, 42)

  it('uses the default for null and undefined', () => {
    expect(codec.decode(undefined)).toEqual(E.right(42))
    expect(codec.decode(null)).toEqual(E.right(42))
  })

  it('keeps provided values, including falsy ones', () => {
    expect(codec.decode(7)).toEqual(E.right(7))
    expect(codec.decode(0)).toEqual(E.right(0))
  })

  it('still fails on the wrong type', () => {
    expect(E.isLeft(codec.decode('x'))).toBe(true)
  })
})
