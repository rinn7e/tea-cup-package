import * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody, secondaryButtonClassName } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

export const SnapDrawer = ({
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
          title: 'Snap points',
          description:
            'Rests at 148px, 50% or 100%. Drag between them or tap the handle.',
          children: (
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm text-slate-600'>
                Active snap:{' '}
                <span data-test='active-snap-index' className='font-bold'>
                  {Drawer.activeSnapIndex(model.drawer.snap)}
                </span>
              </span>
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  type='button'
                  data-test={`set-snap-${index}`}
                  className={secondaryButtonClassName}
                  onClick={() => drawerDispatch({ _tag: 'SetSnap', index })}
                >
                  Snap {index}
                </button>
              ))}
            </div>
          ),
        })
      }
    />
  )
}
