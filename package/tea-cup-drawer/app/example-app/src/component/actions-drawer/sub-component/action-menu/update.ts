import { delayCmd } from '@rinn7e/tea-cup-prelude'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

// Simulated request, slow enough to reopen the drawer for another message
// before it answers
export const loadDelayMs = 1000

export const defaultModel = (messageId: string): Model => ({
  messageId,
  page: 'Main',
  query: '',
  folders: { _tag: 'NotAsked' },
})

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'GoTo':
      if (msg.page === 'MoveTo' && model.folders._tag === 'NotAsked') {
        return [
          { ...model, page: msg.page, query: '', folders: { _tag: 'Loading' } },
          delayCmd<Msg>(loadDelayMs, {
            _tag: 'FoldersLoaded',
            folders: ['Inbox', 'Archive', 'Projects', 'Receipts', 'Travel'],
          }),
        ]
      } else {
        return [{ ...model, page: msg.page, query: '' }, Cmd.none()]
      }
    case 'SetQuery':
      return [{ ...model, query: msg.query }, Cmd.none()]
    case 'FoldersLoaded':
      return [
        { ...model, folders: { _tag: 'Loaded', folders: msg.folders } },
        Cmd.none(),
      ]
    case 'Pick':
      // The parent intercepts this one
      return [model, Cmd.none()]
  }
}
