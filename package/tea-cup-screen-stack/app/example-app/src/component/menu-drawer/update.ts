import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as MoveTo from './sub-component/move-to'
import * as NewFolder from './sub-component/new-folder'
import {
  type MainMsg,
  type MenuScreen,
  type MenuScreenMsg,
  type MenuStackMsg,
  type Model,
  type Msg,
  menuScreenKey,
} from './type'

type MenuStack = ScreenStack.Model<MenuScreen>

// The stack has no identity of its own: a constant key. Screen messages
// inside it are routed by screen key, so a late reply from a closed menu
// finds no such screen in the next one.
const menuContentKey = 'menu'

const drawerConfig = Drawer.defaultConfig<MenuStack>(
  'menu',
  () => menuContentKey,
  // A fixed name: every screen has its own title, and two are rendered
  // while the stack slides
  {
    label: { _tag: 'Text', value: 'Message menu' },
    describedBy: O.none,
  },
)

const stackConfig = ScreenStack.defaultConfig('menu', menuScreenKey)

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(drawerConfig),
  log: [],
})

const addLog =
  (entry: string) =>
  (model: Model): Model => ({ ...model, log: [entry, ...model.log] })

// Drawer
// ---------------------------------

const drawerMsgHandler =
  (subMsg: Drawer.Msg<MenuStack, MenuStackMsg>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return pipe(
      [
        { ...model, drawer },
        cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
      ],
      // The stack's messages, from the drawer content
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (subMsg._tag === 'ContentMsg') {
          return menuStackMsgHandler(subMsg.msg)(m)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

const closeMenu = drawerMsgHandler({ _tag: 'Close' })

// Screen stack
// ---------------------------------

const toMenuStackMsg = (msg: MenuStackMsg): Msg => ({
  _tag: 'DrawerMsg',
  subMsg: { _tag: 'ContentMsg', key: menuContentKey, msg },
})

// A message for the screen with `key`
const toScreenMsg = (key: string, msg: MenuScreenMsg): Msg =>
  toMenuStackMsg({ _tag: 'ScreenMsg', key, msg })

// Run `f` on the menu's screen stack, which lives in the drawer payload.
// Once the drawer has closed `getContent` is `none`, so late messages are
// dropped.
const withMenuStack =
  (f: (stack: MenuStack) => [MenuStack, Cmd<Msg>]) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getContent(menuContentKey)(model.drawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (stack): [Model, Cmd<Msg>] => {
          const [nextStack, cmd] = f(stack)
          return [
            {
              ...model,
              drawer: Drawer.modifyContent<MenuStack>(
                menuContentKey,
                () => nextStack,
              )(model.drawer),
            },
            cmd,
          ]
        },
      ),
    )

const liftStack = ([stack, cmd]: [MenuStack, Cmd<MenuStackMsg>]): [
  MenuStack,
  Cmd<Msg>,
] => [stack, cmd.map(toMenuStackMsg)]

const pushMoveTo = withMenuStack((stack) => {
  const [moveTo, moveToCmd] = MoveTo.init()
  const screen: MenuScreen = { _tag: 'MoveTo', moveTo }
  const [next, stackCmd] = liftStack(
    ScreenStack.pushHandler<MenuScreen>(screen)<MenuScreenMsg>(stack),
  )
  return [
    next,
    Cmd.batch([
      stackCmd,
      // The load answers to this screen's key, wherever it is by then
      moveToCmd.map((msg) =>
        toScreenMsg(menuScreenKey(screen), { _tag: 'MoveToMsg', msg }),
      ),
    ]),
  ]
})

const pushNewFolder = withMenuStack((stack) =>
  liftStack(
    ScreenStack.pushHandler<MenuScreen>({
      _tag: 'NewFolder',
      newFolder: NewFolder.defaultModel(),
    })<MenuScreenMsg>(stack),
  ),
)

const popMenu = withMenuStack((stack) =>
  liftStack(ScreenStack.popHandler<MenuScreen, MenuScreenMsg>(stack)),
)

// Screens
// ---------------------------------

// Like tea-cup-pagination's item messages: the stack only carries the key,
// the parent reads and writes the screen with `getScreen` / `modifyScreen`.

const moveToMsgHandler =
  (key: string, msg: MoveTo.Msg, moveTo: MoveTo.Model) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [nextMoveTo, cmd] = MoveTo.update(msg, moveTo)
    return pipe(
      withMenuStack((stack) => [
        ScreenStack.modifyScreen<MenuScreen>(key, () => ({
          _tag: 'MoveTo',
          moveTo: nextMoveTo,
        }))(stack),
        cmd.map((m) => toScreenMsg(key, { _tag: 'MoveToMsg', msg: m })),
      ])(model),
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (msg._tag === 'Pick') {
          // The parent reacts in the same step: log and close the whole menu
          return pipe(m, addLog(`moved to ${msg.folder}`), closeMenu)
        } else if (msg._tag === 'NewFolder') {
          return pushNewFolder(m)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

const newFolderMsgHandler =
  (key: string, msg: NewFolder.Msg, newFolder: NewFolder.Model) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [nextNewFolder, cmd] = NewFolder.update(msg, newFolder)
    return pipe(
      withMenuStack((stack) => [
        ScreenStack.modifyScreen<MenuScreen>(key, () => ({
          _tag: 'NewFolder',
          newFolder: nextNewFolder,
        }))(stack),
        cmd.map((m) => toScreenMsg(key, { _tag: 'NewFolderMsg', msg: m })),
      ])(model),
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (msg._tag === 'Create') {
          // Back to "Move to", whose search is still there
          return pipe(m, addLog(`created folder ${newFolder.name}`), popMenu)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

// A screen message reaches its screen wherever it is in the stack (on
// show, underneath, sliding away). It is dropped only when the screen is
// gone (popped, or the drawer closed).
const mainMsgHandler =
  (msg: MainMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'MarkAsRead':
        return pipe(model, addLog('marked as read'), closeMenu)
      case 'SelectMultiple':
        return pipe(model, addLog('select multiple'), closeMenu)
      case 'MoveTo':
        return pushMoveTo(model)
    }
  }

const menuScreenMsgHandler =
  (key: string, subMsg: MenuScreenMsg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getContent(menuContentKey)(model.drawer),
      O.chain(ScreenStack.getScreen(key)),
      O.fold(
        (): [Model, Cmd<Msg>] => [
          addLog(`dropped ${subMsg._tag}: screen gone`)(model),
          Cmd.none(),
        ],
        (screen): [Model, Cmd<Msg>] => {
          if (subMsg._tag === 'Back') {
            return popMenu(model)
          } else if (subMsg._tag === 'MainMsg' && screen._tag === 'Main') {
            return mainMsgHandler(subMsg.msg)(model)
          } else if (subMsg._tag === 'MoveToMsg' && screen._tag === 'MoveTo') {
            return moveToMsgHandler(key, subMsg.msg, screen.moveTo)(model)
          } else if (
            subMsg._tag === 'NewFolderMsg' &&
            screen._tag === 'NewFolder'
          ) {
            return newFolderMsgHandler(key, subMsg.msg, screen.newFolder)(model)
          } else {
            // A message of another kind of screen: not reachable with
            // these keys
            return [model, Cmd.none()]
          }
        },
      ),
    )

const menuStackMsgHandler =
  (subMsg: MenuStackMsg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      withMenuStack((stack) => liftStack(ScreenStack.update(subMsg, stack)))(
        model,
      ),
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (subMsg._tag === 'ScreenMsg') {
          return menuScreenMsgHandler(subMsg.key, subMsg.msg)(m)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )

// Update
// ---------------------------------

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open':
      // Every open starts from the first screen
      return drawerMsgHandler({
        _tag: 'Open',
        internal: ScreenStack.defaultModel<MenuScreen>(stackConfig, {
          _tag: 'Main',
        }),
      })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
  }
}
