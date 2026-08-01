/* MIT License

Copyright (c) 2025 Moremi Vannak

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
import { EqAlways } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as EqClass from 'fp-ts/lib/Eq'
import type * as TE from 'fp-ts/lib/TaskEither'
import * as N from 'fp-ts/lib/number'
import { type ReactNode } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

export type Config<Item, ItemMsg, Err> = {
  handler: (
    offset: number,
    limit: number,
  ) => TE.TaskEither<Err, { items: Item[]; totalCount: number }>
  renderItems: (
    items: RD.RemoteData<Err, Item[]>,
    itemDispatch: (item: Item, msg: ItemMsg) => void,
  ) => ReactNode
  renderPagination: (
    currentPage: number,
    pageAmount: number,
    onPageChange: (page: number) => void,
  ) => ReactNode
  limit: number
  scrollContainerId?: string
}

export type Model<Item, Err> = {
  items: RD.RemoteData<Err, Item[]>
  page: number
  pageAmount: number
}

export const mkModelEq = <Item, Err>(
  itemEq: EqClass.Eq<Item>,
  errEq: EqClass.Eq<Err>,
): EqClass.Eq<Model<Item, Err>> =>
  EqClass.struct<Model<Item, Err>>({
    items: RD.getEq(errEq, A.getEq(itemEq)),
    page: N.Eq,
    pageAmount: N.Eq,
  })

export type Msg<Item, ItemMsg, Err> =
  | { _tag: 'ChangePage'; page: number }
  | {
      _tag: 'FetchResponse'
      page: number
      result: RD.RemoteData<Err, { items: Item[]; totalCount: number }>
    }
  | { _tag: 'ItemMsg'; msg: ItemMsg; item: Item }
  | { _tag: 'NoOp' }

export type Props<Item, ItemMsg, Err> = {
  model: Model<Item, Err>
  dispatch: Dispatcher<Msg<Item, ItemMsg, Err>>
  config: Config<Item, ItemMsg, Err>
  itemEq: EqClass.Eq<Item>
  errEq: EqClass.Eq<Err>
}

export const mkPropsEq = <Item, ItemMsg, Err>(
  itemEq: EqClass.Eq<Item>,
  errEq: EqClass.Eq<Err>,
): EqClass.Eq<Props<Item, ItemMsg, Err>> =>
  EqClass.struct({
    model: mkModelEq(itemEq, errEq),
    dispatch: EqAlways,
    config: EqAlways,
    itemEq: EqAlways,
    errEq: EqAlways,
  })
