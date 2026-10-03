import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as S from 'fp-ts/lib/string'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const PayloadDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<string>): Msg => ({ _tag: 'DrawerMsg', subMsg }),
  )
  const id = model.drawer.config.id
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={S.Eq}
      parent={null}
      parentEq={nullEq}
      renderContent={(internal) =>
        drawerBody({
          id,
          dispatch: drawerDispatch,
          title: 'Payload',
          description:
            'The drawer keeps the payload it was opened with until it has fully slid away.',
          children: (
            <p className='text-2xl font-bold'>
              <span data-test='payload-text'>{internal}</span>
            </p>
          ),
        })
      }
    />
  )
}
