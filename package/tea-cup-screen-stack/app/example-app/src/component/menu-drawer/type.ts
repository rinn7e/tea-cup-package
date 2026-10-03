import type * as Drawer from '@rinn7e/tea-cup-drawer'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as EqClass from 'fp-ts/lib/Eq'

import * as MoveTo from './sub-component/move-to'
import * as NewFolder from './sub-component/new-folder'

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

// Each screen appears at most once, so its key is a constant
export const menuScreenKey = (screen: MenuScreen): string => {
  switch (screen._tag) {
    case 'Main':
      return 'main'
    case 'MoveTo':
      return 'move-to'
    case 'NewFolder':
      return 'new-folder'
  }
}

// Messages of the screens. They travel as the stack's `ScreenMsg` with the
// screen's key. A screen only says what the user did; this component
// intercepts them: it updates that screen wherever it is in the stack, or
// moves the stack, logs and closes.
// What the user did on the Main screen
export type MainMsg =
  | { _tag: 'MarkAsRead' }
  | { _tag: 'SelectMultiple' }
  | { _tag: 'MoveTo' }

export type MenuScreenMsg =
  | { _tag: 'MainMsg'; msg: MainMsg }
  | { _tag: 'MoveToMsg'; msg: MoveTo.Msg }
  | { _tag: 'NewFolderMsg'; msg: NewFolder.Msg }
  // The ‹ button of any screen above the root
  | { _tag: 'Back' }

export type Model = {
  // The whole screen stack is the drawer's payload: it starts at "Main" on
  // every open and is dropped once the drawer has closed
  drawer: Drawer.Model<ScreenStack.Model<MenuScreen>>
  // What the menu did, newest first
  log: string[]
}

// The stack's messages: the drawer content's messages (sent with the
// drawer's `contentDispatch`, arriving as its `ContentMsg`)
export type MenuStackMsg = ScreenStack.Msg<MenuScreen, MenuScreenMsg>

export type Msg =
  | { _tag: 'Open' }
  | {
      _tag: 'DrawerMsg'
      subMsg: Drawer.Msg<ScreenStack.Model<MenuScreen>, MenuStackMsg>
    }
