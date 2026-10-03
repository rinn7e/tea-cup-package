import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg, type Step } from './type'

const config = ScreenStack.defaultConfig('wizard')

const firstStep: Step = { _tag: 'Account', email: '' }

export const defaultModel = (): Model => ({
  steps: ScreenStack.defaultModel(config, firstStep),
})

const withStack = ([steps, cmd]: [
  ScreenStack.Model<Step>,
  Cmd<ScreenStack.Msg<Step>>,
]): [Model, Cmd<Msg>] => [
  { steps },
  cmd.map((subMsg): Msg => ({ _tag: 'StackMsg', subMsg })),
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
        ScreenStack.pushHandler<Step>({ _tag: 'Plan', plan: 'Free' })(
          model.steps,
        ),
      )
    case 'Plan':
      return withStack(
        ScreenStack.pushHandler<Step>({
          _tag: 'Summary',
          email: accountEmail(model),
          plan: top.plan,
        })(model.steps),
      )
    case 'Summary':
      // Last step
      return [model, Cmd.none()]
  }
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  const top = ScreenStack.getTop(model.steps)
  switch (msg._tag) {
    case 'StackMsg':
      return withStack(ScreenStack.update(msg.subMsg, model.steps))
    // Edits only apply to the step on show
    case 'SetEmail':
      if (top._tag === 'Account') {
        return [
          {
            steps: ScreenStack.setTop<Step>({ ...top, email: msg.email })(
              model.steps,
            ),
          },
          Cmd.none(),
        ]
      } else {
        return [model, Cmd.none()]
      }
    case 'SetPlan':
      if (top._tag === 'Plan') {
        return [
          {
            steps: ScreenStack.setTop<Step>({ ...top, plan: msg.plan })(
              model.steps,
            ),
          },
          Cmd.none(),
        ]
      } else {
        return [model, Cmd.none()]
      }
    case 'Next':
      return nextHandler(model)
    case 'Restart': {
      // One slide back to the first step (the steps in between are not
      // shown), which comes back empty
      const [steps, cmd] = ScreenStack.popToHandler(0)(model.steps)
      return withStack([ScreenStack.setTop<Step>(firstStep)(steps), cmd])
    }
  }
}
