import * as Drawer from '@rinn7e/tea-cup-drawer'
import { batchCmd, delayCmd, updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as ActionMenu from './component/action-menu'
import * as Feedback from './component/feedback'
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
    actionsDrawer: Drawer.defaultModel(Drawer.defaultConfig('actions')),
    draft: '',
    feedbackDrawer: Drawer.defaultModel(Drawer.defaultConfig('feedback')),
    feedback: Feedback.defaultModel(),
    clearFeedbackWhenClosed: false,
    lastFeedback: null,
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

const actionsDrawerMsgHandler =
  (subMsg: Drawer.Msg<ActionMenu.Model>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const before = model.actionsDrawer
    const [after, cmd] = Drawer.update(subMsg, before)
    return pipe(
      [
        { ...model, actionsDrawer: after },
        cmd.map((m): Msg => ({ _tag: 'ActionsDrawerMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        const wasOpen = Drawer.isOpen(before.animate)
        const isOpen = Drawer.isOpen(after.animate)
        if (wasOpen !== isOpen) {
          const entry = `actions ${isOpen ? 'opened' : 'closed'}`
          return [{ ...m, openLog: [entry, ...m.openLog] }, Cmd.none()]
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

// Option C: the menu lives in the drawer payload, the parent routes its
// messages. Once the drawer has closed `getInternal` is `none`, so late
// messages are dropped.
const actionMenuMsgHandler =
  (subMsg: ActionMenu.Msg) =>
  (model: Model): [Model, Cmd<Msg>] =>
    pipe(
      Drawer.getInternal(model.actionsDrawer),
      O.fold(
        (): [Model, Cmd<Msg>] => [model, Cmd.none()],
        (menu): [Model, Cmd<Msg>] => {
          const [nextMenu, menuCmd] = ActionMenu.update(subMsg, menu)
          return pipe(
            [
              {
                ...model,
                actionsDrawer: Drawer.setInternal(nextMenu)(
                  model.actionsDrawer,
                ),
              },
              menuCmd.map((m): Msg => ({ _tag: 'ActionMenuMsg', subMsg: m })),
            ],
            updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
              if (subMsg._tag === 'Pick') {
                // The parent reacts in the same step: log and close
                return pipe(
                  {
                    ...m,
                    openLog: [`moved to ${subMsg.folder}`, ...m.openLog],
                  },
                  actionsDrawerMsgHandler({ _tag: 'Close' }),
                )
              } else {
                return [m, Cmd.none()]
              }
            }),
          )
        },
      ),
    )

const feedbackDrawerMsgHandler =
  (subMsg: Drawer.Msg<null>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [feedbackDrawer, cmd] = Drawer.update(subMsg, model.feedbackDrawer)
    return pipe(
      [
        { ...model, feedbackDrawer },
        cmd.map((m): Msg => ({ _tag: 'FeedbackDrawerMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        // With side by side state, the parent decides when to reset it: only
        // once the drawer has fully closed
        const isClosed = m.feedbackDrawer.animate._tag === 'Invisible'
        if (m.clearFeedbackWhenClosed && isClosed) {
          return [
            {
              ...m,
              feedback: Feedback.defaultModel(),
              clearFeedbackWhenClosed: false,
            },
            Cmd.none(),
          ]
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

// Option A: the parent owns the form and routes its messages like any other
// child. Nothing ties the form to the drawer's lifetime.
const feedbackMsgHandler =
  (subMsg: Feedback.Msg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [feedback, cmd] = Feedback.update(subMsg, model.feedback)
    return pipe(
      [
        { ...model, feedback },
        cmd.map((m): Msg => ({ _tag: 'FeedbackMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        if (subMsg._tag === 'Submit') {
          const summary = `${m.feedback.rating}★ ${m.feedback.comment}`
          return pipe(
            { ...m, clearFeedbackWhenClosed: true },
            feedbackDrawerMsgHandler({ _tag: 'Close' }),
            // Simulated request: replies after the drawer has closed
            batchCmd(delayCmd<Msg>(800, { _tag: 'FeedbackSent', summary })),
          )
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
    case 'ActionsDrawerMsg':
      return actionsDrawerMsgHandler(msg.subMsg)(model)
    case 'ActionMenuMsg':
      return actionMenuMsgHandler(msg.subMsg)(model)
    case 'SetDraft':
      return [{ ...model, draft: msg.value }, Cmd.none()]
    case 'FeedbackDrawerMsg':
      return feedbackDrawerMsgHandler(msg.subMsg)(model)
    case 'FeedbackMsg':
      return feedbackMsgHandler(msg.subMsg)(model)
    case 'FeedbackSent':
      return [{ ...model, lastFeedback: msg.summary }, Cmd.none()]
  }
}
