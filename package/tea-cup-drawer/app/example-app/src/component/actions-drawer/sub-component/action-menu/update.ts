import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const defaultModel = (): Model => ({ page: 'Main', query: '' })

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'GoTo':
      return [{ ...model, page: msg.page, query: '' }, Cmd.none()]
    case 'SetQuery':
      return [{ ...model, query: msg.query }, Cmd.none()]
    case 'Pick':
      // The parent intercepts this one
      return [model, Cmd.none()]
  }
}
