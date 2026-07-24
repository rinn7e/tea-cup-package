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
import { errorToString } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { Cmd, Task, Time } from 'tea-cup-fp'

import type { Config, Model, Msg } from './type'

const performSearch = <A>(
  config: Config<A>,
  query: string,
  timerId: number,
): Cmd<Msg<A>> => {
  if (query.trim() === '') {
    return Cmd.none()
  } else {
    return Task.attempt(Task.fromPromise(config.handler(query)), (result) => {
      switch (result.tag) {
        case 'Err': {
          return {
            _tag: 'SetItems',
            value: RD.failure(errorToString(result.err)),
            timerId,
          }
        }
        case 'Ok': {
          const res = result.value
          if (res && typeof res === 'object' && '_tag' in res) {
            return {
              _tag: 'SetItems',
              value: pipe(
                res as E.Either<any, any>,
                E.fold(
                  (err: any) => RD.failure(errorToString(err)),
                  (data: any) =>
                    RD.success(Array.isArray(data) ? data : data.data || []),
                ),
              ),
              timerId,
            }
          }
          return {
            _tag: 'SetItems',
            value: RD.success(Array.isArray(res) ? res : []),
            timerId,
          }
        }
      }
    })
  }
}

const debounceSearch = <A>(query: string, timerId: number): Cmd<Msg<A>> => {
  return Task.perform(Time.in(400), () => ({
    _tag: 'DebouncedSearch',
    query,
    timerId,
  }))
}

export const update = <A>(
  msg: Msg<A>,
  field: Model<A>,
): [Model<A>, Cmd<Msg<A>>] => {
  switch (msg._tag) {
    case 'SetQuery': {
      const query = msg.value
      if (query === '') {
        return [{ ...field, query, items: RD.initial }, Cmd.none()]
      }
      const nextTimerId = field.timerId + 1
      return [
        { ...field, query, items: RD.pending, timerId: nextTimerId },
        debounceSearch(query, nextTimerId),
      ]
    }

    case 'DebouncedSearch': {
      if (msg.timerId === field.timerId) {
        return [field, performSearch(field.config, msg.query, msg.timerId)]
      }
      return [field, Cmd.none()]
    }

    case 'SetItems': {
      if (msg.timerId !== field.timerId) {
        return [field, Cmd.none()]
      }
      return [{ ...field, items: msg.value }, Cmd.none()]
    }

    case 'SetSelectedItems': {
      return [{ ...field, selectedItems: msg.items, showValidation: true }, Cmd.none()]
    }

    case 'DeselectItem': {
      const toRemove = msg.item
      const newSelected = pipe(
        field.selectedItems,
        A.filter((p) => !field.config.itemEq.equals(p, toRemove)),
      )

      return [{ ...field, selectedItems: newSelected, showValidation: true }, Cmd.none()]
    }

    case 'SelectItem': {
      const toAdd = msg.item
      const isAlreadySelected = field.selectedItems.some((p) =>
        field.config.itemEq.equals(p, toAdd),
      )

      if (isAlreadySelected) {
        return [field, Cmd.none()]
      }

      return [
        {
          ...field,
          selectedItems: field.selectedItems.concat(toAdd),
          query: '',
          items: RD.initial,
          showValidation: true,
        },
        Cmd.none(),
      ]
    }

    case 'HandleFocus': {
      return [
        {
          ...field,
          isFocus: msg.isFocus,
          showValidation: !msg.isFocus ? true : field.showValidation,
        },
        Cmd.none(),
      ]
    }

    case 'HideValidation': {
      return [{ ...field, showValidation: false }, Cmd.none()]
    }
  }
}
