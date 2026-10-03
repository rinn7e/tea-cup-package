import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg, type Step, type StepMsg, stepKey } from './type'

const config = ScreenStack.defaultConfig('wizard', stepKey)

const firstStep: Step = { _tag: 'Account', email: '' }

export const defaultModel = (): Model => ({
  steps: ScreenStack.defaultModel<Step>(config, firstStep),
})

const withStack = ([steps, cmd]: [
  ScreenStack.Model<Step>,
  Cmd<ScreenStack.Msg<Step, StepMsg>>,
]): [Model, Cmd<Msg>] => [
  { steps },
  cmd.map((subMsg): Msg => ({ _tag: 'ScreenStackMsg', subMsg })),
]

// The email typed in the first step, for the summary
const accountEmail = (model: Model): string =>
  pipe(
    ScreenStack.screens(model.steps),
    A.findFirstMap((step) =>
      step._tag === 'Account' ? O.some(step.email) : O.none,
    ),
    O.getOrElse(() => ''),
  )

// Push the step after the one on show
const nextHandler = (model: Model): [Model, Cmd<Msg>] => {
  const top = ScreenStack.getTop(model.steps)
  switch (top._tag) {
    case 'Account':
      return withStack(
        ScreenStack.pushHandler<Step>({ _tag: 'Plan', plan: 'Free' })<StepMsg>(
          model.steps,
        ),
      )
    case 'Plan':
      return withStack(
        ScreenStack.pushHandler<Step>({
          _tag: 'Summary',
          email: accountEmail(model),
          plan: top.plan,
        })<StepMsg>(model.steps),
      )
    case 'Summary':
      // Last step
      return [model, Cmd.none()]
  }
}

// One slide back to the first step (the steps in between are not shown),
// which comes back empty
const restartHandler = (model: Model): [Model, Cmd<Msg>] => {
  const [steps, cmd] = ScreenStack.popToHandler(0)<Step, StepMsg>(model.steps)
  return withStack([ScreenStack.setTop<Step>(firstStep)(steps), cmd])
}

// Intercepted step messages: edits go to the step with that key, wherever
// it is; navigation moves the stack
const stepMsgHandler =
  (key: string, msg: StepMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'SetEmail':
        return [
          {
            steps: ScreenStack.modifyScreen<Step>(key, (step) =>
              step._tag === 'Account' ? { ...step, email: msg.email } : step,
            )(model.steps),
          },
          Cmd.none(),
        ]
      case 'SetPlan':
        return [
          {
            steps: ScreenStack.modifyScreen<Step>(key, (step) =>
              step._tag === 'Plan' ? { ...step, plan: msg.plan } : step,
            )(model.steps),
          },
          Cmd.none(),
        ]
      case 'Next':
        return nextHandler(model)
      case 'Back':
        return withStack(ScreenStack.popHandler<Step, StepMsg>(model.steps))
      case 'Restart':
        return restartHandler(model)
    }
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'ScreenStackMsg': {
      const subMsg = msg.subMsg
      return pipe(
        withStack(ScreenStack.update(subMsg, model.steps)),
        updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
          if (subMsg._tag === 'ScreenMsg') {
            return stepMsgHandler(subMsg.key, subMsg.msg)(m)
          } else {
            return [m, Cmd.none()]
          }
        }),
      )
    }
  }
}
