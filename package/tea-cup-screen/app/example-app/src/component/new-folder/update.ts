import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const defaultModel = (): Model => ({ name: '' })

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetName':
      return [{ ...model, name: msg.name }, Cmd.none()]
    case 'Create':
      // The parent intercepts this one
      return [model, Cmd.none()]
  }
}
