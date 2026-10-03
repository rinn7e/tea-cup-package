import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const ScrollDrawer = ({
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
    >
      {(_internal) =>
        drawerBody({
          id,
          dispatch: drawerDispatch,
          title: 'Scrollable content',
          description:
            'Scrolled content scrolls back first; only at the top does a swipe drag the drawer.',
          children: (
            <ul
              data-test='scroll-area'
              className='max-h-[40dvh] overflow-y-auto rounded-lg border border-slate-200'
            >
              {Array.from({ length: 60 }, (_, i) => (
                <li
                  key={i}
                  className='border-b border-slate-100 px-4 py-3 text-sm last:border-b-0'
                >
                  Item {i + 1}
                </li>
              ))}
            </ul>
          ),
        })
      }
    </DrawerMemo>
  )
}
