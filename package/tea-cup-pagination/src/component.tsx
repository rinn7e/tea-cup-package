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
import React, { memo } from 'react'

import { type Props, mkPropsEq } from './type'

export const PaginationComponent = <Item, ItemMsg, Err, Parent>({
  model,
  dispatch,
  config,
  parent,
}: Props<Item, ItemMsg, Err, Parent>) => {
  const { page, pageAmount } = model

  return (
    <>
      {config.renderItems(
        model.items,
        (item, msg) => {
          dispatch({ _tag: 'ItemMsg', key: config.uniqueKeyField(item), msg })
        },
        parent,
      )}

      {config.renderPagination(
        page,
        pageAmount,
        (p) => {
          dispatch({ _tag: 'ChangePage', page: p })
        },
        parent,
      )}
    </>
  )
}

export const PaginationMemo = memo(PaginationComponent, (prev, next) => {
  const propEq = mkPropsEq(prev.itemEq, prev.errEq, prev.parentEq)
  return propEq.equals(prev, next)
}) as <Item, ItemMsg, Err, Parent>(
  props: Props<Item, ItemMsg, Err, Parent>,
) => React.ReactElement
