import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as ActionMenu from './sub-component/action-menu'
import { type Model, type Msg } from './type'

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(Drawer.defaultConfig('actions')),
  draft: '',
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.drawer.animate)

const drawerMsgHandler =
  (subMsg: Drawer.Msg<ActionMenu.Model>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return [
      { ...model, drawer },
      cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
    ]
  }

// Option C: the menu lives in the drawer payload and its messages are routed
// here. Once the drawer has closed `getInternal` is `none`, so late messages
// are dropped.
const actionMenuMsgHandler =
  (subMsg: ActionMenu.Msg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getInternal(model.drawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (menu): [Model, Cmd<Msg>] => {
          const [nextMenu, menuCmd] = ActionMenu.update(subMsg, menu)
          return pipe(
            [
              { ...model, drawer: Drawer.setInternal(nextMenu)(model.drawer) },
              menuCmd.map((m): Msg => ({ _tag: 'ActionMenuMsg', subMsg: m })),
            ],
            updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
              if (subMsg._tag === 'Pick') {
                // React in the same step: close the drawer
                return drawerMsgHandler({ _tag: 'Close' })(m)
              } else {
                return [m, Cmd.none()]
              }
            }),
          )
        },
      ),
    )

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open':
      return drawerMsgHandler({
        _tag: 'Open',
        internal: ActionMenu.defaultModel(),
      })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
    case 'ActionMenuMsg':
      return actionMenuMsgHandler(msg.subMsg)(model)
    case 'SetDraft':
      return [{ ...model, draft: msg.value }, Cmd.none()]
  }
}
