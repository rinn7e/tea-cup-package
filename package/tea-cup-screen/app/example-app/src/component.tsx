import * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle, DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as Screen from '@rinn7e/tea-cup-screen'
import { ScreenStackComponent } from '@rinn7e/tea-cup-screen/component'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import { MoveTo } from './component/move-to/component'
import { NewFolder } from './component/new-folder/component'
import { Wizard } from './component/wizard/component'
import {
  type MenuScreen,
  MenuScreenEq,
  MenuStackEq,
  type Model,
  type Msg,
} from './type'

const buttonClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700'

const rowClassName =
  'flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

const badgeClassName =
  'rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600'

// "Idle @ 1", "Sliding Forward Run @ 2", ...
const stackStateText = <Item,>(stack: Screen.Stack<Item>): string => {
  const transition = stack.transition
  switch (transition._tag) {
    case 'Idle':
      return `Idle @ ${Screen.depth(stack)}`
    case 'Sliding':
      return `Sliding ${transition.direction} ${transition.phase} @ ${Screen.depth(stack)}`
  }
}

// Header shared by the menu screens: back button above the root, title
const screenHeader = (args: {
  title: string
  depth: number
  dispatch: Dispatcher<Msg>
}) => (
  <div className='relative flex h-10 items-center justify-center'>
    {args.depth > 0 && (
      <button
        type='button'
        data-test='screen-back'
        aria-label='Back'
        className='absolute left-0 rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100'
        onClick={() =>
          args.dispatch({ _tag: 'MenuStackMsg', subMsg: { _tag: 'Pop' } })
        }
      >
        ‹
      </button>
    )}
    <h2 className='font-bold text-slate-900'>{args.title}</h2>
  </div>
)

// Opaque, so the incoming screen covers the outgoing one while sliding
const screenClassName = 'flex flex-col gap-1 bg-white px-4 pb-8'

const menuScreenView = (
  screen: MenuScreen,
  depth: number,
  dispatch: Dispatcher<Msg>,
): ReactNode => {
  switch (screen._tag) {
    case 'Main':
      return (
        <div data-test='screen-main' className={screenClassName}>
          {screenHeader({ title: 'More settings', depth, dispatch })}
          <button
            type='button'
            data-test='mark-as-read'
            className={rowClassName}
            onClick={() => dispatch({ _tag: 'MarkAsRead' })}
          >
            Mark as read
          </button>
          <button
            type='button'
            data-test='select-multiple'
            className={rowClassName}
            onClick={() => dispatch({ _tag: 'SelectMultiple' })}
          >
            Select multiple
          </button>
          <hr className='my-1 border-slate-200' />
          <button
            type='button'
            data-test='move-to'
            className={rowClassName}
            onClick={() => dispatch({ _tag: 'PushMoveTo' })}
          >
            Move to
            <span aria-hidden='true' className='text-lg text-slate-400'>
              ›
            </span>
          </button>
        </div>
      )
    case 'MoveTo':
      return (
        <div data-test='screen-move-to' className={screenClassName}>
          {screenHeader({ title: 'Move to', depth, dispatch })}
          <MoveTo
            model={screen.moveTo}
            dispatch={map(
              dispatch,
              (msg): Msg => ({
                _tag: 'MenuScreenMsg',
                subMsg: { _tag: 'MoveToMsg', msg },
              }),
            )}
          />
        </div>
      )
    case 'NewFolder':
      return (
        <div data-test='screen-new-folder' className={screenClassName}>
          {screenHeader({ title: 'New folder', depth, dispatch })}
          <NewFolder
            model={screen.newFolder}
            dispatch={map(
              dispatch,
              (msg): Msg => ({
                _tag: 'MenuScreenMsg',
                subMsg: { _tag: 'NewFolderMsg', msg },
              }),
            )}
          />
        </div>
      )
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
  const menuDrawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<Screen.Stack<MenuScreen>>): Msg => ({
      _tag: 'MenuDrawerMsg',
      subMsg,
    }),
  )
  const menuStackDispatch = map(
    dispatch,
    (subMsg: Screen.Msg<MenuScreen>): Msg => ({
      _tag: 'MenuStackMsg',
      subMsg,
    }),
  )

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
                'The whole stack is the drawer payload: it starts at the first screen on every open. Escape closes the whole menu.',
              badges: (
                <>
                  <span data-test='state-menu' className={badgeClassName}>
                    {model.menuDrawer.animate._tag}
                  </span>
                  <span data-test='stack-state-menu' className={badgeClassName}>
                    {pipe(
                      Drawer.getInternal(model.menuDrawer),
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
                    onClick={() => dispatch({ _tag: 'OpenMenu' })}
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
          </div>

          <div className='rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400 shadow-sm'>
            <h2 className='mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase'>
              Seen by the parent
            </h2>
            <ul data-test='log' className='font-mono'>
              {model.log.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <DrawerMemo
        model={model.menuDrawer}
        dispatch={menuDrawerDispatch}
        itemEq={MenuStackEq}
        parent={null}
        parentEq={nullEq}
      >
        {(stack) => (
          <div data-test='content-menu' className='flex flex-col'>
            <DrawerHandle dispatch={menuDrawerDispatch} />
            {/* Not memoized: the drawer's memo already compares the stack */}
            <ScreenStackComponent
              model={stack}
              dispatch={menuStackDispatch}
              itemEq={MenuScreenEq}
              parent={null}
              parentEq={nullEq}
              renderScreen={(screen, depth) =>
                menuScreenView(screen, depth, dispatch)
              }
            />
          </div>
        )}
      </DrawerMemo>
    </div>
  )
}
