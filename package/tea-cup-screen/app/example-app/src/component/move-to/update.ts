import { delayCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

// Simulated request, slow enough to pop the screen before it answers
export const loadDelayMs = 1000

export const init = (): [Model, Cmd<Msg>] => [
  { folders: O.none, query: '' },
  delayCmd<Msg>(loadDelayMs, {
    _tag: 'FoldersLoaded',
    folders: ['Active', 'Forums', 'Ignored', 'Default'],
  }),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'FoldersLoaded':
      return [{ ...model, folders: O.some(msg.folders) }, Cmd.none()]
    case 'SetQuery':
      return [{ ...model, query: msg.query }, Cmd.none()]
    case 'Pick':
    case 'NewFolder':
      // The parent intercepts these
      return [model, Cmd.none()]
  }
}
