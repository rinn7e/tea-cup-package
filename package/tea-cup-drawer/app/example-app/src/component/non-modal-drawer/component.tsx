import * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const NonModalDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<null>): Msg => ({ _tag: 'DrawerMsg', subMsg }),
  )
  const id = model.drawer.config.id
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={nullEq}
      parent={null}
      parentEq={nullEq}
      className='h-full max-h-[97%] border-t border-slate-200'
      renderContent={(_internal) =>
        drawerBody({
          id,
          config: model.drawer.config,
          dispatch: drawerDispatch,
          title: 'Non-modal sheet',
          description:
            'No overlay: the page behind stays interactive. Drag it up to expand.',
          children: (
            <span className='text-sm text-slate-600'>
              Active snap:{' '}
              <span data-test='non-modal-snap-index' className='font-bold'>
                {Drawer.activeSnapIndex(model.drawer.snap)}
              </span>
            </span>
          ),
        })
      }
    />
  )
}
