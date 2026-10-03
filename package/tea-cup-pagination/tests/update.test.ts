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
import * as RD from '@devexperts/remote-data-ts'
import * as O from 'fp-ts/lib/Option'
import * as TE from 'fp-ts/lib/TaskEither'
import { describe, expect, it } from 'vitest'

import {
  type Config,
  type Model,
  type Msg,
  getItem,
  modifyItem,
  update,
} from '../src'

type Product = { id: string; name: string; isFavorite: boolean }

type ProductMsg = { _tag: 'ToggleFavorite' }

const config: Config<Product, ProductMsg, string, null> = {
  handler: () => TE.right({ items: [], totalCount: 0 }),
  renderItems: () => null,
  renderPagination: () => null,
  uniqueKeyField: (product) => product.id,
  limit: 2,
}

const apple: Product = { id: 'a', name: 'Apple', isFavorite: false }
const banana: Product = { id: 'b', name: 'Banana', isFavorite: false }

const loaded = (items: Product[]): Model<Product, string> => ({
  items: RD.success(items),
  page: 1,
  pageAmount: 3,
})

const run = (
  model: Model<Product, string>,
  msg: Msg<Product, ProductMsg, string>,
) => update(config)(msg, model)[0]

describe('getItem', () => {
  it('finds the current item by key', () => {
    expect(getItem(config, 'b')(loaded([apple, banana]))).toEqual(
      O.some(banana),
    )
  })

  it('is none when the item is not on the page', () => {
    expect(getItem(config, 'z')(loaded([apple, banana]))).toEqual(O.none)
  })

  it('is none when the page is not loaded', () => {
    expect(getItem(config, 'a')({ ...loaded([]), items: RD.pending })).toEqual(
      O.none,
    )
    expect(
      getItem(config, 'a')({ ...loaded([]), items: RD.failure('boom') }),
    ).toEqual(O.none)
  })
})

describe('modifyItem', () => {
  const favorite = (p: Product): Product => ({ ...p, isFavorite: true })

  it('updates only the item with the key, from its current value', () => {
    const edited = { ...banana, name: 'Banana (edited)' }
    const model = modifyItem(config, 'b', favorite)(loaded([apple, edited]))
    expect(model.items).toEqual(
      RD.success([apple, { ...edited, isFavorite: true }]),
    )
  })

  it('returns the same model when the item is not on the page', () => {
    const model = loaded([apple, banana])
    expect(modifyItem(config, 'z', favorite)(model)).toBe(model)
  })

  it('returns the same model when the page is not loaded', () => {
    const model: Model<Product, string> = { ...loaded([]), items: RD.pending }
    expect(modifyItem(config, 'a', favorite)(model)).toBe(model)
  })

  it('keeps the page and page count', () => {
    const model = modifyItem(config, 'a', favorite)(loaded([apple]))
    expect(model.page).toBe(1)
    expect(model.pageAmount).toBe(3)
  })
})

describe('update', () => {
  it('leaves ItemMsg to the parent', () => {
    const model = loaded([apple, banana])
    expect(
      run(model, {
        _tag: 'ItemMsg',
        key: 'a',
        msg: { _tag: 'ToggleFavorite' },
      }),
    ).toBe(model)
  })

  it('ChangePage starts loading the new page', () => {
    const model = run(loaded([apple]), { _tag: 'ChangePage', page: 2 })
    expect(model.page).toBe(2)
    expect(model.items).toEqual(RD.pending)
  })

  it('ChangePage to the current page does nothing', () => {
    const model = loaded([apple])
    expect(run(model, { _tag: 'ChangePage', page: 1 })).toBe(model)
  })

  it('stores the response of the current page and the page count', () => {
    const model = run(
      { ...loaded([]), items: RD.pending },
      {
        _tag: 'FetchResponse',
        page: 1,
        result: RD.success({ items: [apple, banana], totalCount: 5 }),
      },
    )
    expect(model.items).toEqual(RD.success([apple, banana]))
    expect(model.pageAmount).toBe(3)
  })

  it('ignores the response of another page', () => {
    const model: Model<Product, string> = {
      ...loaded([]),
      items: RD.pending,
      page: 2,
    }
    expect(
      run(model, {
        _tag: 'FetchResponse',
        page: 1,
        result: RD.success({ items: [apple], totalCount: 1 }),
      }),
    ).toBe(model)
  })
})
