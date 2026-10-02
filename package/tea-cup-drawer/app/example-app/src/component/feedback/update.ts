import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const defaultModel = (): Model => ({ rating: 0, comment: '' })

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetRating':
      return [{ ...model, rating: msg.rating }, Cmd.none()]
    case 'SetComment':
      return [{ ...model, comment: msg.comment }, Cmd.none()]
    case 'Submit':
      // The parent intercepts this one
      return [model, Cmd.none()]
  }
}
