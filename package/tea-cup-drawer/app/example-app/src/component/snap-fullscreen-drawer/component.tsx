import * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const SnapFullscreenDrawer = ({
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
      className='h-full max-h-none'
      renderContent={(_internal) =>
        drawerBody({
          id,
          dispatch: drawerDispatch,
          title: 'Snap to full screen',
          description:
            'Starts as a short sheet. Drag it up or tap the handle to go full screen; drag down or tap the overlay to close.',
          children: (
            <>
              <span className='text-sm text-slate-600'>
                Active snap:{' '}
                <span data-test='fullscreen-snap-index' className='font-bold'>
                  {Drawer.activeSnapIndex(model.drawer.snap)}
                </span>
              </span>
              <div className='flex flex-col gap-3 text-sm text-slate-600'>
                {Array.from({ length: 12 }, (_, i) => (
                  <p key={i}>
                    Paragraph {i + 1}: only visible once the drawer is expanded.
                  </p>
                ))}
              </div>
            </>
          ),
        })
      }
    />
  )
}
