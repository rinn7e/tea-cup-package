import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as B from 'fp-ts/lib/boolean'
import { type Dispatcher, map } from 'tea-cup-fp'

import { buttonClassName, drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const DragLockDrawer = ({
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
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={nullEq}
      // Whether dragging is locked, for the button's label
      parent={model.drawer.isDragLocked}
      parentEq={B.Eq}
      renderContent={(_internal, _contentDispatch, isDragLocked) =>
        drawerBody({
          id: model.drawer.config.id,
          config: model.drawer.config,
          dispatch: drawerDispatch,
          title: 'Drag lock',
          description:
            'While locked, a swipe doesn’t drag the drawer; the Close button still closes it.',
          children: (
            <button
              type='button'
              data-test='toggle-lock-dragLock'
              className={buttonClassName}
              onClick={() => dispatch({ _tag: 'ToggleLock' })}
            >
              {isDragLocked ? 'Unlock dragging' : 'Lock dragging'}
            </button>
          ),
        })
      }
    />
  )
}
