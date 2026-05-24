import { msgCmd } from '@rinn7e/tea-cup-prelude'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => {
  const items = Array.from({ length: 50 }).map((_, i) => ({
    id: `in-view-sample-item-${i}`,
    height: Math.floor(Math.random() * 150) + 100,
    inView: false,
  }))

  return [{ items, topReachedCount: 0, bottomReachedCount: 0 }, Cmd.none()]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetInView': {
      const newItems = [...model.items]
      const oldInView = newItems[msg.index].inView
      newItems[msg.index] = { ...newItems[msg.index], inView: msg.inView }

      const newModel = { ...model, items: newItems }
      const cmd =
        msg.inView && !oldInView
          ? msg.index === 0
            ? msgCmd<Msg>({ _tag: 'TopReached' })
            : msg.index === model.items.length - 1
              ? msgCmd<Msg>({ _tag: 'BottomReached' })
              : Cmd.none<Msg>()
          : Cmd.none<Msg>()

      return [newModel, cmd]
    }

    case 'TopReached':
      console.log('🍵 Top reached!')
      return [
        { ...model, topReachedCount: model.topReachedCount + 1 },
        Cmd.none(),
      ]

    case 'BottomReached':
      console.log('🍵 Bottom reached!')
      return [
        { ...model, bottomReachedCount: model.bottomReachedCount + 1 },
        Cmd.none(),
      ]
  }
}
