import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => [
  {
    username: '',
    email: '',
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetUsername':
      return [{ ...model, username: msg.username }, Cmd.none()]

    case 'SetEmail':
      return [{ ...model, email: msg.email }, Cmd.none()]

    case 'Submit':
      return [model, Cmd.none()]
  }
}
