import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type'

export const init = (route: { readonly slug: string }): [Model, Cmd<Msg>] => [
  {
    slug: route.slug,
    commentsCount: 0,
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'AddComment':
      return [{ ...model, commentsCount: model.commentsCount + 1 }, Cmd.none()]
  }
}
