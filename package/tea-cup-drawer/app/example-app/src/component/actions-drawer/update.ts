import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as ActionMenu from './sub-component/action-menu'
import { type ActionsContentMsg, type Model, type Msg, titleId } from './type'

// The menu is identified by the message it was opened for
const config = Drawer.defaultConfig<ActionMenu.Model>(
  'actions',
  (menu) => menu.messageId,
  // Named by its title, whose text follows the payload
  {
    label: { _tag: 'ElementId', id: titleId },
    describedBy: O.none,
  },
)

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(config),
  draft: '',
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.drawer.animate)

type DrawerMsg = Drawer.Msg<ActionMenu.Model, ActionsContentMsg>

const toContentMsg = (key: string, msg: ActionsContentMsg): Msg => ({
  _tag: 'DrawerMsg',
  subMsg: { _tag: 'ContentMsg', key, msg },
})

const closeDrawer = (model: Model): [Model, Cmd<Msg>] => {
  const [drawer, cmd] = Drawer.update<ActionMenu.Model, ActionsContentMsg>(
    { _tag: 'Close' },
    model.drawer,
  )
  return [
    { ...model, drawer },
    cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
  ]
}

// Option C: the menu lives in the drawer payload. Its messages carry the
// payload's key: once the drawer has closed, or was reopened for another
// message, `getContent` is `none` and a late reply (the folder list) is
// dropped instead of reaching the new menu.
const actionMenuMsgHandler =
  (key: string, subMsg: ActionMenu.Msg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getContent(key)(model.drawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (menu): [Model, Cmd<Msg>] => {
          const [nextMenu, menuCmd] = ActionMenu.update(subMsg, menu)
          return pipe(
            [
              {
                ...model,
                drawer: Drawer.modifyContent<ActionMenu.Model>(
                  key,
                  () => nextMenu,
                )(model.drawer),
              },
              menuCmd.map((m) =>
                toContentMsg(key, { _tag: 'ActionMenuMsg', subMsg: m }),
              ),
            ],
            updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
              if (subMsg._tag === 'Pick') {
                // React in the same step: close the drawer
                return closeDrawer(m)
              } else {
                return [m, Cmd.none()]
              }
            }),
          )
        },
      ),
    )

// The content's messages, intercepted from the drawer's `ContentMsg`
const itemMsgHandler =
  (key: string, msg: ActionsContentMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'ActionMenuMsg':
        return actionMenuMsgHandler(key, msg.subMsg)(model)
      case 'SetDraft':
        return [{ ...model, draft: msg.value }, Cmd.none()]
    }
  }

const drawerMsgHandler =
  (subMsg: DrawerMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return pipe(
      [
        { ...model, drawer },
        cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (subMsg._tag === 'ContentMsg') {
          return itemMsgHandler(subMsg.key, subMsg.msg)(m)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open':
      return drawerMsgHandler({
        _tag: 'Open',
        internal: ActionMenu.defaultModel(msg.messageId),
      })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
  }
}
