import { Cmd } from 'tea-cup-fp'

import type { Shared } from '@/common/shared'

import type { Model, Msg } from './type'

export const init = (shared: Shared): [Model, Cmd<Msg>] => {
  const username =
    shared.user._tag === 'Some' ? shared.user.value.username : 'User'
  return [
    {
      bio: `Bio for ${username}`,
    },
    Cmd.none(),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetBio':
      return [{ ...model, bio: msg.bio }, Cmd.none()]

    case 'Logout':
      return [model, Cmd.none()]
  }
}
