import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as Screen from '@rinn7e/tea-cup-screen'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as MoveTo from './component/move-to'
import * as NewFolder from './component/new-folder'
import * as Wizard from './component/wizard'
import {
  type MenuScreen,
  type MenuScreenMsg,
  type Model,
  type Msg,
} from './type'

type MenuStack = Screen.Stack<MenuScreen>

const menuDrawerConfig = Drawer.defaultConfig('menu')

const menuStackConfig = Screen.defaultConfig('menu')

export const init = (): [Model, Cmd<Msg>] => [
  {
    menuDrawer: Drawer.defaultModel(menuDrawerConfig),
    wizard: Wizard.defaultModel(),
    log: [],
  },
  Cmd.none(),
]

const addLog =
  (entry: string) =>
  (model: Model): Model => ({ ...model, log: [entry, ...model.log] })

// Drawer
// ---------------------------------

const menuDrawerMsgHandler =
  (subMsg: Drawer.Msg<MenuStack>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [menuDrawer, cmd] = Drawer.update(subMsg, model.menuDrawer)
    return [
      { ...model, menuDrawer },
      cmd.map((m): Msg => ({ _tag: 'MenuDrawerMsg', subMsg: m })),
    ]
  }

const closeMenu = menuDrawerMsgHandler({ _tag: 'Close' })

// Screen stack
// ---------------------------------

const toMenuStackMsg = (subMsg: Screen.Msg<MenuScreen>): Msg => ({
  _tag: 'MenuStackMsg',
  subMsg,
})

const toMoveToMsg = (msg: MoveTo.Msg): Msg => ({
  _tag: 'MenuScreenMsg',
  subMsg: { _tag: 'MoveToMsg', msg },
})

const toNewFolderMsg = (msg: NewFolder.Msg): Msg => ({
  _tag: 'MenuScreenMsg',
  subMsg: { _tag: 'NewFolderMsg', msg },
})

// Run `f` on the menu's screen stack, which lives in the drawer payload.
// Once the drawer has closed `getInternal` is `none`, so late messages are
// dropped.
const withMenuStack =
  (f: (stack: MenuStack) => [MenuStack, Cmd<Msg>]) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getInternal(model.menuDrawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (stack): [Model, Cmd<Msg>] => {
          const [nextStack, cmd] = f(stack)
          return [
            {
              ...model,
              menuDrawer: Drawer.setInternal(nextStack)(model.menuDrawer),
            },
            cmd,
          ]
        },
      ),
    )

const liftStack = ([stack, cmd]: [MenuStack, Cmd<Screen.Msg<MenuScreen>>]): [
  MenuStack,
  Cmd<Msg>,
] => [stack, cmd.map(toMenuStackMsg)]

const pushMoveTo = withMenuStack((stack) => {
  const [moveTo, moveToCmd] = MoveTo.init()
  const [next, stackCmd] = liftStack(
    Screen.pushHandler<MenuScreen>({ _tag: 'MoveTo', moveTo })(stack),
  )
  return [next, Cmd.batch([stackCmd, moveToCmd.map(toMoveToMsg)])]
})

const pushNewFolder = withMenuStack((stack) =>
  liftStack(
    Screen.pushHandler<MenuScreen>({
      _tag: 'NewFolder',
      newFolder: NewFolder.defaultModel(),
    })(stack),
  ),
)

const popMenu = withMenuStack((stack) => liftStack(Screen.popHandler(stack)))

// Screens
// ---------------------------------

const moveToMsgHandler =
  (msg: MoveTo.Msg, moveTo: MoveTo.Model) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [nextMoveTo, cmd] = MoveTo.update(msg, moveTo)
    return pipe(
      withMenuStack((stack) => [
        Screen.setTop<MenuScreen>({ _tag: 'MoveTo', moveTo: nextMoveTo })(
          stack,
        ),
        cmd.map(toMoveToMsg),
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
  (msg: NewFolder.Msg, newFolder: NewFolder.Model) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [nextNewFolder, cmd] = NewFolder.update(msg, newFolder)
    return pipe(
      withMenuStack((stack) => [
        Screen.setTop<MenuScreen>({
          _tag: 'NewFolder',
          newFolder: nextNewFolder,
        })(stack),
        cmd.map(toNewFolderMsg),
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

// A screen message only reaches the screen on show: one for a screen that
// was popped (or is sliding away) is stale and dropped
const menuScreenMsgHandler =
  (subMsg: MenuScreenMsg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getInternal(model.menuDrawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [
          addLog(`dropped ${subMsg._tag} (menu closed)`)(model),
          Cmd.none(),
        ],
        (stack): [Model, Cmd<Msg>] => {
          const top = Screen.getTop(stack)
          if (subMsg._tag === 'MoveToMsg' && top._tag === 'MoveTo') {
            return moveToMsgHandler(subMsg.msg, top.moveTo)(model)
          } else if (
            subMsg._tag === 'NewFolderMsg' &&
            top._tag === 'NewFolder'
          ) {
            return newFolderMsgHandler(subMsg.msg, top.newFolder)(model)
          } else {
            return [addLog(`dropped stale ${subMsg._tag}`)(model), Cmd.none()]
          }
        },
      ),
    )

// Update
// ---------------------------------

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'OpenMenu':
      // Every open starts from the first screen
      return menuDrawerMsgHandler({
        _tag: 'Open',
        internal: Screen.defaultModel<MenuScreen>(menuStackConfig, {
          _tag: 'Main',
        }),
      })(model)
    case 'MenuDrawerMsg':
      return menuDrawerMsgHandler(msg.subMsg)(model)
    case 'MenuStackMsg':
      return withMenuStack((stack) =>
        liftStack(Screen.update(msg.subMsg, stack)),
      )(model)
    case 'MenuScreenMsg':
      return menuScreenMsgHandler(msg.subMsg)(model)
    case 'MarkAsRead':
      return pipe(model, addLog('marked as read'), closeMenu)
    case 'SelectMultiple':
      return pipe(model, addLog('select multiple'), closeMenu)
    case 'PushMoveTo':
      return pushMoveTo(model)
    case 'WizardMsg': {
      const [wizard, cmd] = Wizard.update(msg.subMsg, model.wizard)
      return [
        { ...model, wizard },
        cmd.map((subMsg): Msg => ({ _tag: 'WizardMsg', subMsg })),
      ]
    }
  }
}
