import { Cmd } from 'tea-cup-fp'

import * as MenuDrawer from './component/menu-drawer'
import * as Settings from './component/settings'
import * as Wizard from './component/wizard'
import { type Model, type Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => [
  {
    menuDrawer: MenuDrawer.defaultModel(),
    wizard: Wizard.defaultModel(),
    settings: Settings.defaultModel(),
  },
  Cmd.none(),
]

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'MenuDrawerMsg': {
      const [menuDrawer, cmd] = MenuDrawer.update(msg.subMsg, model.menuDrawer)
      return [
        { ...model, menuDrawer },
        cmd.map((subMsg): Msg => ({ _tag: 'MenuDrawerMsg', subMsg })),
      ]
    }
    case 'WizardMsg': {
      const [wizard, cmd] = Wizard.update(msg.subMsg, model.wizard)
      return [
        { ...model, wizard },
        cmd.map((subMsg): Msg => ({ _tag: 'WizardMsg', subMsg })),
      ]
    }
    case 'SettingsMsg': {
      const [settings, cmd] = Settings.update(msg.subMsg, model.settings)
      return [
        { ...model, settings },
        cmd.map((subMsg): Msg => ({ _tag: 'SettingsMsg', subMsg })),
      ]
    }
  }
}
