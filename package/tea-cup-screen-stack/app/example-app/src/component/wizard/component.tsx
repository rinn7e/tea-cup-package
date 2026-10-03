import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import { ScreenStackMemo } from '@rinn7e/tea-cup-screen-stack/component'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import {
  type Model,
  type Msg,
  type Plan,
  type Step,
  StepEq,
  type StepMsg,
} from './type'

const plans: Plan[] = ['Free', 'Pro']

const primaryClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40'

const secondaryClassName =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'

// Opaque, so the incoming step covers the outgoing one while sliding
const stepClassName = 'flex flex-col gap-3 bg-white p-1'

const stepView = (
  step: Step,
  stepDispatch: (msg: StepMsg) => void,
  depth: number,
): ReactNode => {
  const back =
    depth > 0 ? (
      <button
        type='button'
        data-test='wizard-back'
        className={secondaryClassName}
        onClick={() => stepDispatch({ _tag: 'Back' })}
      >
        Back
      </button>
    ) : null
  switch (step._tag) {
    case 'Account':
      return (
        <div data-test='wizard-account' className={stepClassName}>
          <h3 className='font-semibold text-slate-900'>1. Account</h3>
          <input
            data-test='wizard-email'
            value={step.email}
            placeholder='you@example.com'
            onChange={(e) =>
              stepDispatch({ _tag: 'SetEmail', email: e.target.value })
            }
            className='rounded-lg border border-slate-300 px-3 py-2 text-sm'
          />
          <div className='flex gap-2'>
            <button
              type='button'
              data-test='wizard-next'
              disabled={step.email.trim() === ''}
              className={primaryClassName}
              onClick={() => stepDispatch({ _tag: 'Next' })}
            >
              Next
            </button>
          </div>
        </div>
      )
    case 'Plan':
      return (
        <div data-test='wizard-plan' className={stepClassName}>
          <h3 className='font-semibold text-slate-900'>2. Plan</h3>
          {plans.map((plan) => (
            <label
              key={plan}
              className='flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm'
            >
              <input
                type='radio'
                name='wizard-plan'
                data-test={`wizard-plan-${plan}`}
                checked={step.plan === plan}
                onChange={() => stepDispatch({ _tag: 'SetPlan', plan })}
              />
              {plan}
            </label>
          ))}
          <div className='flex gap-2'>
            {back}
            <button
              type='button'
              data-test='wizard-next'
              className={primaryClassName}
              onClick={() => stepDispatch({ _tag: 'Next' })}
            >
              Next
            </button>
          </div>
        </div>
      )
    case 'Summary':
      return (
        <div data-test='wizard-summary' className={stepClassName}>
          <h3 className='font-semibold text-slate-900'>3. Summary</h3>
          <p data-test='wizard-summary-text' className='text-sm text-slate-600'>
            {step.email} on {step.plan}
          </p>
          <div className='flex gap-2'>
            {back}
            <button
              type='button'
              data-test='wizard-restart'
              className={secondaryClassName}
              onClick={() => stepDispatch({ _tag: 'Restart' })}
            >
              Restart
            </button>
          </div>
        </div>
      )
  }
}

export const Wizard = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => (
  <ScreenStackMemo<Step, StepMsg, null>
    model={model.steps}
    dispatch={map(
      dispatch,
      (subMsg: ScreenStack.Msg<Step, StepMsg>): Msg => ({
        _tag: 'ScreenStackMsg',
        subMsg,
      }),
    )}
    itemEq={StepEq}
    parent={null}
    parentEq={nullEq}
    renderScreen={(step, stepDispatch, depth) =>
      stepView(step, stepDispatch, depth)
    }
  />
)
