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
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Sub } from 'tea-cup-fp'

import * as SliderField from './sub-component/slider-field'
import { type Model, type Msg } from './type'

export const subscriptions = (model: Model): Sub<Msg> =>
  pipe(
    Array.from(model.forms.entries()),
    A.filterMap(([key, val]) => {
      switch (val._tag) {
        case 'SliderType':
          return O.some(
            SliderField.subscriptions(val.model, val.config).map(
              (subMsg: SliderField.Msg): Msg => ({
                _tag: 'SliderFieldMsg',
                key,
                subMsg,
              }),
            ),
          )
        default:
          return O.none
      }
    }),
    Sub.batch,
  )
