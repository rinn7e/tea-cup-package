import { Cmd } from 'tea-cup-fp'

import type { Model, Msg } from './type'

export const init = (route: { readonly slug?: string }): [Model, Cmd<Msg>] => [
  {
    slug: route.slug,
    title: route.slug ? `Edit: ${route.slug}` : '',
    body: '',
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetTitle':
      return [{ ...model, title: msg.title }, Cmd.none()]

    case 'SetBody':
      return [{ ...model, body: msg.body }, Cmd.none()]

    // Purely handled by parent: parent intercepts to navigate to the published ArticlePage
    case 'Submit':
      return [model, Cmd.none()]
  }
}
