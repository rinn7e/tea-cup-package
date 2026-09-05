import { Cmd } from 'tea-cup-fp'

import { type Model, type RoomItemMsg } from './type'

export const init = (isExpand = false): [Model, Cmd<RoomItemMsg>] => [
  { isExpand },
  Cmd.none(),
]

export const update = (
  msg: RoomItemMsg,
  model: Model,
): [Model, Cmd<RoomItemMsg>] => {
  switch (msg._tag) {
    case 'ToggleExpand':
      return [{ ...model, isExpand: !model.isExpand }, Cmd.none()]
    case 'SelectRoom':
    case 'MarkAsRead':
    case 'ToggleFavorite':
      return [model, Cmd.none()]
  }
}
