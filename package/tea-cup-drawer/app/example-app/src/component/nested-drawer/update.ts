import * as Drawer from '@rinn7e/tea-cup-drawer'
import { Cmd } from 'tea-cup-fp'

import { bodyConfig } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

const pageConfig: Drawer.Config<null> = {
  ...bodyConfig<null>('nested', () => 'nested'),
  direction: 'right',
}

// Shown inside the page's drawer, so it is above the page's content and
// moves with it
const sheetConfig: Drawer.Config<null> = {
  ...bodyConfig<null>('nestedSheet', () => 'nestedSheet'),
  modality: { _tag: 'NonModal' },
  dismissible: false,
  portal: {
    _tag: 'Container',
    get: () => document.getElementById(Drawer.contentDomId(pageConfig.id)),
  },
}

export const defaultModel = (): Model => ({
  page: Drawer.defaultModel(pageConfig),
  sheet: Drawer.defaultModel(sheetConfig),
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.page.animate)

const pageMsgHandler =
  (subMsg: Drawer.Msg<null>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [page, cmd] = Drawer.update(subMsg, model.page)
    return [
      { ...model, page },
      cmd.map((m): Msg => ({ _tag: 'PageMsg', subMsg: m })),
    ]
  }

const sheetMsgHandler =
  (subMsg: Drawer.Msg<null>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [sheet, cmd] = Drawer.update(subMsg, model.sheet)
    return [
      { ...model, sheet },
      cmd.map((m): Msg => ({ _tag: 'SheetMsg', subMsg: m })),
    ]
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open': {
      // The page and its sheet
      const [opened, pageCmd] = pageMsgHandler({
        _tag: 'Open',
        internal: null,
      })(model)
      const [next, sheetCmd] = sheetMsgHandler({
        _tag: 'Open',
        internal: null,
      })(opened)
      return [next, Cmd.batch([pageCmd, sheetCmd])]
    }
    case 'PageMsg': {
      const [next, cmd] = pageMsgHandler(msg.subMsg)(model)
      // The page closed: its sheet goes with it
      if (!isOpen(next) && Drawer.isOpen(next.sheet.animate)) {
        const [closed, sheetCmd] = sheetMsgHandler({ _tag: 'Close' })(next)
        return [closed, Cmd.batch([cmd, sheetCmd])]
      } else {
        return [next, cmd]
      }
    }
    case 'SheetMsg':
      return sheetMsgHandler(msg.subMsg)(model)
  }
}
