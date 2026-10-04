import * as Drawer from '@rinn7e/tea-cup-drawer'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import { MenuDrawer } from './component/menu-drawer/component'
import { Settings } from './component/settings/component'
import { Wizard } from './component/wizard/component'
import { type Model, type Msg } from './type'

const buttonClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700'

const badgeClassName =
  'rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600'

// "Idle @ 1", "Pushing Run @ 2", ...
const stackStateText = <Item,>(stack: ScreenStack.Model<Item>): string => {
  const transition = stack.transition
  switch (transition._tag) {
    case 'Idle':
      return `Idle @ ${ScreenStack.depth(stack)}`
    case 'Pushing':
    case 'Popping':
      return `${transition._tag} ${transition.phase} @ ${ScreenStack.depth(stack)}`
  }
}

const card = (args: {
  title: string
  description: string
  badges: ReactNode
  children: ReactNode
}) => (
  <div className='flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200'>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <h2 className='font-bold text-slate-900'>{args.title}</h2>
      <div className='flex gap-1'>{args.badges}</div>
    </div>
    <p className='text-sm text-slate-600'>{args.description}</p>
    {args.children}
  </div>
)

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  return (
    <div className='h-full'>
      {/* The page scrolls inside this container, not the body: the drawer's
          body scroll lock never shifts it */}
      <div className='h-full overflow-y-scroll px-6 py-12 pb-48'>
        <div className='mx-auto flex max-w-4xl flex-col gap-8'>
          <div className='text-center'>
            <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
              TeaCup Screen Kitchen Sink
            </h1>
            <p className='mt-3 text-lg text-slate-600'>
              A screen stack with animated push and pop: every transition phase
              is a state in the model.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            {card({
              title: 'Drawer + screen stack',
              description:
                'The whole stack is the drawer payload: it starts at the first screen on every open. The overlay closes the whole menu.',
              badges: (
                <>
                  <span data-test='state-menu' className={badgeClassName}>
                    {model.menuDrawer.drawer.animate._tag}
                  </span>
                  <span data-test='stack-state-menu' className={badgeClassName}>
                    {pipe(
                      Drawer.getInternal(model.menuDrawer.drawer),
                      O.fold(() => '—', stackStateText),
                    )}
                  </span>
                </>
              ),
              children: (
                <div className='flex flex-wrap gap-2'>
                  <button
                    type='button'
                    data-test='trigger-menu'
                    className={buttonClassName}
                    onClick={() =>
                      dispatch({
                        _tag: 'MenuDrawerMsg',
                        subMsg: { _tag: 'Open' },
                      })
                    }
                  >
                    More settings
                  </button>
                </div>
              ),
            })}

            {card({
              title: 'Standalone wizard',
              description:
                'The same stack without a drawer. Each step keeps what was typed in it when you come back.',
              badges: (
                <span data-test='stack-state-wizard' className={badgeClassName}>
                  {stackStateText(model.wizard.steps)}
                </span>
              ),
              children: (
                <div
                  data-test='wizard'
                  className='rounded-xl border border-slate-200 bg-white p-3'
                >
                  <Wizard
                    model={model.wizard}
                    dispatch={map(
                      dispatch,
                      (subMsg): Msg => ({ _tag: 'WizardMsg', subMsg }),
                    )}
                  />
                </div>
              ),
            })}

            {card({
              title: 'Settings',
              description:
                'Free navigation: every row goes deeper, Back goes up, Top jumps to the root in one slide. Nothing blocks.',
              badges: (
                <span
                  data-test='stack-state-settings'
                  className={badgeClassName}
                >
                  {stackStateText(model.settings.pages)}
                </span>
              ),
              children: (
                <>
                  <p
                    data-test='settings-path'
                    className='font-mono text-xs text-slate-500'
                  >
                    {ScreenStack.screens(model.settings.pages).join(' › ')}
                  </p>
                  <div
                    data-test='settings'
                    className='rounded-xl border border-slate-200 bg-white p-3'
                  >
                    <Settings
                      model={model.settings}
                      dispatch={map(
                        dispatch,
                        (subMsg): Msg => ({ _tag: 'SettingsMsg', subMsg }),
                      )}
                    />
                  </div>
                </>
              ),
            })}
          </div>

          <div className='rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400 shadow-sm'>
            <h2 className='mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase'>
              Menu log
            </h2>
            <ul data-test='log' className='font-mono'>
              {model.menuDrawer.log.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <MenuDrawer
        model={model.menuDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'MenuDrawerMsg', subMsg }),
        )}
      />
    </div>
  )
}
