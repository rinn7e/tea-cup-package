import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { buttonClassName, drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const NonDismissibleDrawer = ({
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
      renderContent={(_internal) =>
        drawerBody({
          id,
          dispatch: drawerDispatch,
          title: 'Non-dismissible',
          description:
            'Overlay taps, Escape and swipes are ignored; only the button closes it.',
          children: (
            <button
              type='button'
              data-test='dismiss-button'
              className={buttonClassName}
              onClick={() => drawerDispatch({ _tag: 'Close' })}
            >
              Dismiss
            </button>
          ),
        })
      }
    />
  )
}
