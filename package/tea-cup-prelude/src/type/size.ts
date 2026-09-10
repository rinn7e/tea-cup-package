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
import type * as EqClass from 'fp-ts/lib/Eq'
import * as N from 'fp-ts/lib/number'
import type * as OrdClass from 'fp-ts/lib/Ord'

import { brandedNumber } from '../common'

// Size
// -----------------------------------------------------------------
export type Size = number & { readonly __brand: unique symbol }
export const SizeEq: EqClass.Eq<Size> = N.Eq as unknown as EqClass.Eq<Size>
export const SizeOrd: OrdClass.Ord<Size> = N.Ord as unknown as OrdClass.Ord<Size>
export const SizeJson = brandedNumber<Size>('Size')
export const size = (value: number): Size => value as Size
export const defaultPageSize = 25

