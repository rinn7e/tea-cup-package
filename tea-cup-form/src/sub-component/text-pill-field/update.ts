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
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type/model'

export const update = (msg: Msg, field: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'UpdateTextPill':
      return [
        {
          ...field,
          currentValue: msg.event.currentTarget.value,
          showValidation: true,
        },
        Cmd.none(),
      ]
    case 'AddPill':
      return [
        {
          ...field,
          allValues: field.allValues.concat(msg.value),
          currentValue: '',
          showValidation: true,
        },
        Cmd.none(),
      ]
    case 'RemovePill': {
      const result = pipe(field.allValues, A.deleteAt(msg.index))
      return [
        {
          ...field,
          allValues: result._tag === 'Some' ? result.value : field.allValues,
          showValidation: true,
        },
        Cmd.none(),
      ]
    }
    case 'HandleFocus':
      return [
        {
          ...field,
          isFocus: msg.isFocus,
          showValidation: !msg.isFocus ? true : field.showValidation,
        },
        Cmd.none(),
      ]
    case 'HideValidation':
      return [
        {
          ...field,
          showValidation: false,
        },
        Cmd.none(),
      ]
  }
}
