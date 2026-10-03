import type * as Drawer from '@rinn7e/tea-cup-drawer'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as EqClass from 'fp-ts/lib/Eq'

import * as MoveTo from './component/move-to'
import * as NewFolder from './component/new-folder'
import type * as Wizard from './component/wizard'

// The screens of the "More settings" menu: one union, each case carries its
// own state (a TEA model or nothing)
export type MenuScreen =
  | { _tag: 'Main' }
  | { _tag: 'MoveTo'; moveTo: MoveTo.Model }
  | { _tag: 'NewFolder'; newFolder: NewFolder.Model }

export const MenuScreenEq: EqClass.Eq<MenuScreen> = {
  equals: (x, y) => {
    switch (x._tag) {
      case 'Main':
        return y._tag === 'Main'
      case 'MoveTo':
        return y._tag === 'MoveTo' && MoveTo.ModelEq.equals(x.moveTo, y.moveTo)
      case 'NewFolder':
        return (
          y._tag === 'NewFolder' &&
          NewFolder.ModelEq.equals(x.newFolder, y.newFolder)
        )
    }
  },
}

export const MenuStackEq: EqClass.Eq<ScreenStack.Model<MenuScreen>> =
  ScreenStack.getModelEq(MenuScreenEq)

// Messages of the screens that have a TEA model, routed by the parent to
// the screen on show
export type MenuScreenMsg =
  | { _tag: 'MoveToMsg'; msg: MoveTo.Msg }
  | { _tag: 'NewFolderMsg'; msg: NewFolder.Msg }

export type Model = {
  // The whole screen stack is the drawer's payload: it starts at "Main" on
  // every open and is dropped once the drawer has closed
  menuDrawer: Drawer.Model<ScreenStack.Model<MenuScreen>>
  wizard: Wizard.Model
  // What the parent did, newest first
  log: string[]
}

export type Msg =
  | { _tag: 'OpenMenu' }
  | { _tag: 'MenuDrawerMsg'; subMsg: Drawer.Msg<ScreenStack.Model<MenuScreen>> }
  | { _tag: 'MenuStackMsg'; subMsg: ScreenStack.Msg<MenuScreen> }
  | { _tag: 'MenuScreenMsg'; subMsg: MenuScreenMsg }
  | { _tag: 'MarkAsRead' }
  | { _tag: 'SelectMultiple' }
  | { _tag: 'PushMoveTo' }
  | { _tag: 'WizardMsg'; subMsg: Wizard.Msg }
