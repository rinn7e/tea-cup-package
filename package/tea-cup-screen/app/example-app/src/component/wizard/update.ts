import * as Screen from '@rinn7e/tea-cup-screen'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg, type Step } from './type'

const config = Screen.defaultConfig('wizard')

const firstStep: Step = { _tag: 'Account', email: '' }

export const defaultModel = (): Model => ({
  steps: Screen.defaultModel(config, firstStep),
})

const withStack = ([steps, cmd]: [Screen.Stack<Step>, Cmd<Screen.Msg<Step>>]): [
  Model,
  Cmd<Msg>,
] => [{ steps }, cmd.map((subMsg): Msg => ({ _tag: 'StackMsg', subMsg }))]

// The email typed in the first step, for the summary
const accountEmail = (model: Model): string =>
  pipe(
    model.steps.stack,
    A.findFirstMap((step) =>
      step._tag === 'Account' ? O.some(step.email) : O.none,
    ),
    O.getOrElse(() => ''),
  )

// Push the step after the one on show
const nextHandler = (model: Model): [Model, Cmd<Msg>] => {
  const top = Screen.getTop(model.steps)
  switch (top._tag) {
    case 'Account':
      return withStack(
        Screen.pushHandler<Step>({ _tag: 'Plan', plan: 'Free' })(model.steps),
      )
    case 'Plan':
      return withStack(
        Screen.pushHandler<Step>({
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
  const top = Screen.getTop(model.steps)
  switch (msg._tag) {
    case 'StackMsg':
      return withStack(Screen.update(msg.subMsg, model.steps))
    // Edits only apply to the step on show
    case 'SetEmail':
      if (top._tag === 'Account') {
        return [
          {
            steps: Screen.setTop<Step>({ ...top, email: msg.email })(
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
            steps: Screen.setTop<Step>({ ...top, plan: msg.plan })(model.steps),
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
      const [steps, cmd] = Screen.popToHandler(0)(model.steps)
      return withStack([Screen.setTop<Step>(firstStep)(steps), cmd])
    }
  }
}
