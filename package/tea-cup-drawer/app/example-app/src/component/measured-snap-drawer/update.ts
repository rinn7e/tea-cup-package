import * as Drawer from '@rinn7e/tea-cup-drawer'
import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  type MeasuredContentMsg,
  type Model,
  type Msg,
  type Summary,
  titleId,
} from './type'

// One summary at a time: a constant key
const contentKey = 'measuredSnap'

const config: Drawer.Config<Summary> = {
  ...Drawer.defaultConfig<Summary>('measuredSnap', () => contentKey, {
    label: { _tag: 'ElementId', id: titleId },
    describedBy: O.none,
  }),
  snap: {
    _tag: 'Snap',
    // The compact point is a placeholder: the content measures the real one
    // as soon as it is rendered (while mounting), before it slides in
    initial: {
      before: [],
      active: { _tag: 'Pixel', value: 160 },
      after: [{ _tag: 'Fraction', value: 1 }],
    },
    fadeFrom: O.none,
    sequential: false,
  },
}

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(config),
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.drawer.animate)

const modifySummary =
  (f: (summary: Summary) => Summary) =>
  (model: Model): [Model, Cmd<Msg>] => [
    {
      ...model,
      drawer: Drawer.modifyContent<Summary>(contentKey, f)(model.drawer),
    },
    Cmd.none(),
  ]

// The content's messages, intercepted from the drawer's `ContentMsg`
const contentMsgHandler =
  (msg: MeasuredContentMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'AddLine':
        return modifySummary((s) => ({ lines: s.lines + 1 }))(model)
      case 'RemoveLine':
        return modifySummary((s) => ({ lines: Math.max(1, s.lines - 1) }))(
          model,
        )
      case 'Measured':
        // The compact point follows the content; full screen stays
        return drawerMsgHandler({
          _tag: 'SetSnapPoints',
          points: [
            { _tag: 'Pixel', value: msg.px },
            { _tag: 'Fraction', value: 1 },
          ],
        })(model)
    }
  }

const drawerMsgHandler =
  (subMsg: Drawer.Msg<Summary, MeasuredContentMsg>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return pipe(
      [
        { ...model, drawer },
        cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (subMsg._tag === 'ContentMsg') {
          return contentMsgHandler(subMsg.msg)(m)
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Open':
      return drawerMsgHandler({ _tag: 'Open', internal: { lines: 1 } })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
  }
}
