import type * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as EqClass from 'fp-ts/lib/Eq'

// A sign-up wizard: a screen stack without a drawer. Each step keeps what
// was typed in it, so going back shows it again.
export type Plan = 'Free' | 'Pro'

export type Step =
  | { _tag: 'Account'; email: string }
  | { _tag: 'Plan'; plan: Plan }
  | { _tag: 'Summary'; email: string; plan: Plan }

export const StepEq: EqClass.Eq<Step> = {
  equals: (x, y) => {
    switch (x._tag) {
      case 'Account':
        return y._tag === 'Account' && x.email === y.email
      case 'Plan':
        return y._tag === 'Plan' && x.plan === y.plan
      case 'Summary':
        return y._tag === 'Summary' && x.email === y.email && x.plan === y.plan
    }
  },
}

// Each step appears at most once, so its key is a constant
export const stepKey = (step: Step): string => {
  switch (step._tag) {
    case 'Account':
      return 'account'
    case 'Plan':
      return 'plan'
    case 'Summary':
      return 'summary'
  }
}

// Messages of a step, sent with the step's key. The step only says what the
// user did; the wizard intercepts them (edits the step, or moves the stack).
export type StepMsg =
  | { _tag: 'SetEmail'; email: string }
  | { _tag: 'SetPlan'; plan: Plan }
  | { _tag: 'Next' }
  | { _tag: 'Back' }
  | { _tag: 'Restart' }

export type Model = {
  steps: ScreenStack.Model<Step>
}

export type Msg = {
  _tag: 'ScreenStackMsg'
  subMsg: ScreenStack.Msg<Step, StepMsg>
}
