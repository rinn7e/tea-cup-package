import * as Drawer from '@rinn7e/tea-cup-drawer'
import { batchCmd, delayCmd, updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as Feedback from './sub-component/feedback'
import { type Model, type Msg } from './type'

export const defaultModel = (): Model => ({
  drawer: Drawer.defaultModel(Drawer.defaultConfig('feedback')),
  feedback: Feedback.defaultModel(),
  clearFeedbackWhenClosed: false,
  lastFeedback: null,
})

// For the parent, to notice open / close changes
export const isOpen = (model: Model): boolean =>
  Drawer.isOpen(model.drawer.animate)

const drawerMsgHandler =
  (subMsg: Drawer.Msg<null>) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const [drawer, cmd] = Drawer.update(subMsg, model.drawer)
    return pipe(
      [
        { ...model, drawer },
        cmd.map((m): Msg => ({ _tag: 'DrawerMsg', subMsg: m })),
      ],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        // With side by side state, this component decides when to reset it:
        // only once the drawer has fully closed
        const isClosed = m.drawer.animate._tag === 'Invisible'
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

// Option A: the form is routed like any other child. Nothing ties it to the
// drawer's lifetime.
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
            drawerMsgHandler({ _tag: 'Close' }),
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
    case 'Open':
      return drawerMsgHandler({ _tag: 'Open', internal: null })(model)
    case 'DrawerMsg':
      return drawerMsgHandler(msg.subMsg)(model)
    case 'FeedbackMsg':
      return feedbackMsgHandler(msg.subMsg)(model)
    case 'FeedbackSent':
      return [{ ...model, lastFeedback: msg.summary }, Cmd.none()]
  }
}
