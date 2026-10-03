import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle, DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { type Dispatcher, map } from 'tea-cup-fp'

import {
  type Model as ActionMenuModel,
  ModelEq as ActionMenuModelEq,
  type Msg as ActionMenuMsg,
} from './sub-component/action-menu'
import { ActionMenu } from './sub-component/action-menu/component'
import { ActionsParentEq, type Model, type Msg } from './type'

// The menu (a TEA component) lives in the payload and resets on every open;
// the draft lives outside it and survives closing
export const ActionsDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<ActionMenuModel>): Msg => ({
      _tag: 'DrawerMsg',
      subMsg,
    }),
  )
  const actionMenuDispatch = map(
    dispatch,
    (subMsg: ActionMenuMsg): Msg => ({ _tag: 'ActionMenuMsg', subMsg }),
  )
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={ActionMenuModelEq}
      parent={{ draft: model.draft }}
      parentEq={ActionsParentEq}
    >
      {(menu, parent) => (
        <div
          data-test='content-actions'
          className='flex min-h-0 flex-1 flex-col'
        >
          <DrawerHandle dispatch={drawerDispatch} />
          <div className='flex flex-col gap-3 px-6 pt-2 pb-8'>
            <h2 className='text-lg font-bold text-slate-900'>
              Message actions
            </h2>
            <ActionMenu model={menu} dispatch={actionMenuDispatch} />
            <label className='flex flex-col gap-1 text-sm text-slate-600'>
              Note (kept when the drawer closes)
              <textarea
                data-test='draft'
                value={parent.draft}
                onChange={(e) =>
                  dispatch({ _tag: 'SetDraft', value: e.target.value })
                }
                className='rounded-lg border border-slate-300 px-3 py-2 text-sm'
              />
            </label>
          </div>
        </div>
      )}
    </DrawerMemo>
  )
}
