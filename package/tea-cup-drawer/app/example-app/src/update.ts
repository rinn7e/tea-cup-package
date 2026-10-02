import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type DemoKey, type Model, type Msg } from './type'

const configs: Record<DemoKey, Drawer.Config> = {
  basic: Drawer.defaultConfig('basic'),
  nonDismissible: {
    ...Drawer.defaultConfig('nonDismissible'),
    dismissible: false,
  },
  snap: {
    ...Drawer.defaultConfig('snap'),
    snapPoints: [
      { _tag: 'Pixel', value: 148 },
      { _tag: 'Fraction', value: 0.5 },
      { _tag: 'Fraction', value: 1 },
    ],
    initialSnap: 1,
  },
  // Starts as a short sheet like 'basic' (overlay included) and can be
  // dragged up to full screen
  snapFullscreen: {
    ...Drawer.defaultConfig('snapFullscreen'),
    snapPoints: [
      { _tag: 'Pixel', value: 260 },
      { _tag: 'Fraction', value: 1 },
    ],
    fadeFromIndex: O.some(0),
  },
  top: { ...Drawer.defaultConfig('top'), direction: 'top' },
  left: { ...Drawer.defaultConfig('left'), direction: 'left' },
  right: { ...Drawer.defaultConfig('right'), direction: 'right' },
  scroll: Drawer.defaultConfig('scroll'),
  // A persistent sheet like a chat composer: no overlay, page stays usable
  nonModal: {
    ...Drawer.defaultConfig('nonModal'),
    modal: false,
    dismissible: false,
    snapPoints: [
      { _tag: 'Pixel', value: 120 },
      { _tag: 'Fraction', value: 1 },
    ],
  },
  payload: Drawer.defaultConfig('payload'),
  handleOnly: { ...Drawer.defaultConfig('handleOnly'), handleOnly: true },
}

export const init = (): [Model, Cmd<Msg>] => [
  {
    drawers: {
      basic: Drawer.defaultModel(configs.basic),
      nonDismissible: Drawer.defaultModel(configs.nonDismissible),
      snap: Drawer.defaultModel(configs.snap),
      snapFullscreen: Drawer.defaultModel(configs.snapFullscreen),
      top: Drawer.defaultModel(configs.top),
      left: Drawer.defaultModel(configs.left),
      right: Drawer.defaultModel(configs.right),
      scroll: Drawer.defaultModel(configs.scroll),
      nonModal: Drawer.defaultModel(configs.nonModal),
      payload: Drawer.defaultModel(configs.payload),
      handleOnly: Drawer.defaultModel(configs.handleOnly),
    },
    openLog: [],
  },
  Cmd.none(),
]

const drawerMsgHandler =
  (key: DemoKey, subMsg: Drawer.Msg<string>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const before = model.drawers[key]
    const [after, cmd] = Drawer.update(subMsg, before)
    return pipe(
      [
        { ...model, drawers: { ...model.drawers, [key]: after } },
        cmd.map((m): Msg => ({ _tag: 'DrawerMsg', key, subMsg: m })),
      ],
      // The parent's equivalent of vaul's `onOpenChange`: it also notices
      // closes decided by the drawer itself (swipe, overlay, Escape)
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        const wasOpen = Drawer.isOpen(before.animate)
        const isOpen = Drawer.isOpen(after.animate)
        if (wasOpen !== isOpen) {
          const entry = `${key} ${isOpen ? 'opened' : 'closed'}`
          return [{ ...m, openLog: [entry, ...m.openLog] }, Cmd.none()]
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'DrawerMsg':
      return drawerMsgHandler(msg.key, msg.subMsg)(model)
  }
}
