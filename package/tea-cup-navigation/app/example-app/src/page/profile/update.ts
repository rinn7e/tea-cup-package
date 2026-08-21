import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type'

export const init = (route: {
  readonly username: string
  readonly favorites: boolean
}): [Model, Cmd<Msg>] => [
  {
    username: route.username,
    favorites: route.favorites,
    count: 0,
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Increment':
      return [{ ...model, count: model.count + 1 }, Cmd.none()]

    case 'ToggleFavorites':
      return [{ ...model, favorites: !model.favorites }, Cmd.none()]
  }
}
