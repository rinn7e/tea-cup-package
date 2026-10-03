import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle, DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import type * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import { ScreenStackComponent } from '@rinn7e/tea-cup-screen-stack/component'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import { MoveTo } from './sub-component/move-to/component'
import { NewFolder } from './sub-component/new-folder/component'
import {
  type MenuScreen,
  MenuScreenEq,
  type MenuScreenMsg,
  MenuStackEq,
  type Model,
  type Msg,
} from './type'

const rowClassName =
  'flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

// Header shared by the menu screens: back button above the root, title
const screenHeader = (args: {
  title: string
  depth: number
  screenDispatch: (msg: MenuScreenMsg) => void
}) => (
  <div className='relative flex h-10 items-center justify-center'>
    {args.depth > 0 && (
      <button
        type='button'
        data-test='screen-back'
        aria-label='Back'
        className='absolute left-0 rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100'
        onClick={() => args.screenDispatch({ _tag: 'Back' })}
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
  screenDispatch: (msg: MenuScreenMsg) => void,
  depth: number,
): ReactNode => {
  switch (screen._tag) {
    case 'Main':
      return (
        <div data-test='screen-main' className={screenClassName}>
          {screenHeader({ title: 'More settings', depth, screenDispatch })}
          <button
            type='button'
            data-test='mark-as-read'
            className={rowClassName}
            onClick={() =>
              screenDispatch({ _tag: 'MainMsg', msg: { _tag: 'MarkAsRead' } })
            }
          >
            Mark as read
          </button>
          <button
            type='button'
            data-test='select-multiple'
            className={rowClassName}
            onClick={() =>
              screenDispatch({
                _tag: 'MainMsg',
                msg: { _tag: 'SelectMultiple' },
              })
            }
          >
            Select multiple
          </button>
          <hr className='my-1 border-slate-200' />
          <button
            type='button'
            data-test='move-to'
            className={rowClassName}
            onClick={() =>
              screenDispatch({ _tag: 'MainMsg', msg: { _tag: 'MoveTo' } })
            }
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
          {screenHeader({ title: 'Move to', depth, screenDispatch })}
          <MoveTo
            model={screen.moveTo}
            dispatch={(msg) => screenDispatch({ _tag: 'MoveToMsg', msg })}
          />
        </div>
      )
    case 'NewFolder':
      return (
        <div data-test='screen-new-folder' className={screenClassName}>
          {screenHeader({ title: 'New folder', depth, screenDispatch })}
          <NewFolder
            model={screen.newFolder}
            dispatch={(msg) => screenDispatch({ _tag: 'NewFolderMsg', msg })}
          />
        </div>
      )
  }
}

// The drawer with the menu's screen stack. Rendered in a portal, so it can
// sit anywhere in the page.
export const MenuDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<ScreenStack.Model<MenuScreen>>): Msg => ({
      _tag: 'DrawerMsg',
      subMsg,
    }),
  )
  const stackDispatch = map(
    dispatch,
    (subMsg: ScreenStack.Msg<MenuScreen, MenuScreenMsg>): Msg => ({
      _tag: 'ScreenStackMsg',
      subMsg,
    }),
  )
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={MenuStackEq}
      parent={null}
      parentEq={nullEq}
    >
      {(stack) => (
        <div data-test='content-menu' className='flex flex-col'>
          <DrawerHandle dispatch={drawerDispatch} />
          {/* Not memoized: the drawer's memo already compares the stack */}
          <ScreenStackComponent
            model={stack}
            dispatch={stackDispatch}
            itemEq={MenuScreenEq}
            parent={null}
            parentEq={nullEq}
            renderScreen={(screen, screenDispatch, depth) =>
              menuScreenView(screen, screenDispatch, depth)
            }
          />
        </div>
      )}
    </DrawerMemo>
  )
}
