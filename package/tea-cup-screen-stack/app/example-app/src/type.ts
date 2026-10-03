import type * as MenuDrawer from './component/menu-drawer'
import type * as Settings from './component/settings'
import type * as Wizard from './component/wizard'

// One child component per demo
export type Model = {
  // A drawer whose payload is a screen stack
  menuDrawer: MenuDrawer.Model
  // A standalone stack with forms
  wizard: Wizard.Model
  // Free navigation: no step blocks going forward or back
  settings: Settings.Model
}

export type Msg =
  | { _tag: 'MenuDrawerMsg'; subMsg: MenuDrawer.Msg }
  | { _tag: 'WizardMsg'; subMsg: Wizard.Msg }
  | { _tag: 'SettingsMsg'; subMsg: Settings.Msg }
