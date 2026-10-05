import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo, drawerHandleView } from '@rinn7e/tea-cup-drawer/component'
import { type Dispatcher, map } from 'tea-cup-fp'

import {
  type Model as ActionMenuModel,
  ModelEq as ActionMenuModelEq,
} from './sub-component/action-menu'
import { ActionMenu } from './sub-component/action-menu/component'
import {
  type ActionsContentMsg,
  ActionsParentEq,
  type Model,
  type Msg,
  titleId,
} from './type'

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
    (subMsg: Drawer.Msg<ActionMenuModel, ActionsContentMsg>): Msg => ({
      _tag: 'DrawerMsg',
      subMsg,
    }),
  )
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={ActionMenuModelEq}
      parent={{ draft: model.draft }}
      parentEq={ActionsParentEq}
      renderContent={(menu, contentDispatch, parent) => (
        <div
          data-test='content-actions'
          className='flex min-h-0 flex-1 flex-col'
        >
          {drawerHandleView(model.drawer.config, drawerDispatch)}
          <div className='flex flex-col gap-3 px-6 pt-2 pb-8'>
            <h2
              id={titleId}
              data-test='title-actions'
              className='text-lg font-bold text-slate-900'
            >
              Actions for message {menu.messageId}
            </h2>
            <ActionMenu
              model={menu}
              dispatch={(subMsg) =>
                contentDispatch({ _tag: 'ActionMenuMsg', subMsg })
              }
            />
            <label className='flex flex-col gap-1 text-sm text-slate-600'>
              Note (kept when the drawer closes)
              <textarea
                data-test='draft'
                value={parent.draft}
                onChange={(e) =>
                  contentDispatch({ _tag: 'SetDraft', value: e.target.value })
                }
                className='rounded-lg border border-slate-300 px-3 py-2 text-sm'
              />
            </label>
          </div>
        </div>
      )}
    />
  )
}
