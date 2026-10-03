import * as Drawer from '@rinn7e/tea-cup-drawer'
import { type Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

const config: Drawer.Config<null> = {
  ...Drawer.defaultConfig<null>('handleOnly', () => 'handleOnly'),
  handleOnly: true,
}

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(config),
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.drawer.animate)

const drawerMsgHandler =
  (subMsg: Drawer.Msg<null>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return [
      { ...model, drawer },
      cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
    ]
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open':
      return drawerMsgHandler({ _tag: 'Open', internal: null })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
  }
}
