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
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

import { type Config, type Model } from './type'

// Only the key function is needed, so the full `Config` can be passed
type KeyConfig<Item> = Pick<
  Config<Item, unknown, unknown, unknown>,
  'uniqueKeyField'
>

// The current value of the item with `key` on the loaded page; `none` when
// the page isn't loaded or the item isn't on it (any more)
export const getItem =
  <Item>(config: KeyConfig<Item>, key: string) =>
  <Err>(model: Model<Item, Err>): O.Option<Item> =>
    pipe(
      model.items,
      RD.toOption,
      O.chain(A.findFirst((item) => config.uniqueKeyField(item) === key)),
    )

// Update the item with `key` on the loaded page; the same model when the
// page isn't loaded or the item isn't on it
export const modifyItem =
  <Item>(config: KeyConfig<Item>, key: string, f: (item: Item) => Item) =>
  <Err>(model: Model<Item, Err>): Model<Item, Err> => {
    const items = model.items
    if (items._tag === 'RemoteSuccess') {
      return pipe(
        items.value,
        A.findIndex((item) => config.uniqueKeyField(item) === key),
        O.fold(
          () => model,
          (index) => ({
            ...model,
            items: RD.success(
              pipe(
                items.value,
                A.modifyAt(index, f),
                O.getOrElse(() => items.value),
              ),
            ),
          }),
        ),
      )
    } else {
      // Nothing loaded to modify
      return model
    }
  }
