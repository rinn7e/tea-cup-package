import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => [
  {
    email: '',
    isSubmitting: false,
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetEmail':
      return [{ ...model, email: msg.email }, Cmd.none()]

    case 'Submit':
      return [{ ...model, isSubmitting: true }, Cmd.none()]
  }
}
