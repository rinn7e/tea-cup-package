import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

const SheetEq = {
  equals: (x: Drawer.Model<null>, y: Drawer.Model<null>) => x === y,
}

export const NestedDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const pageDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<null>): Msg => ({ _tag: 'PageMsg', subMsg }),
  )
  const sheetDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<null>): Msg => ({ _tag: 'SheetMsg', subMsg }),
  )
  return (
    <DrawerMemo
      model={model.page}
      dispatch={pageDispatch}
      itemEq={nullEq}
      parent={model.sheet}
      parentEq={SheetEq}
      className='w-[85vw] max-w-md'
      renderContent={(_internal, _contentDispatch, sheet) => (
        <>
          {drawerBody({
            id: model.page.config.id,
            config: model.page.config,
            dispatch: pageDispatch,
            title: 'Nested drawer',
            description:
              'A page from the right with a bottom sheet shown inside it: each handle sits on its own drawer’s edge.',
          })}
          <DrawerMemo
            model={sheet}
            dispatch={sheetDispatch}
            itemEq={nullEq}
            parent={null}
            parentEq={nullEq}
            renderContent={() =>
              drawerBody({
                id: sheet.config.id,
                config: sheet.config,
                dispatch: sheetDispatch,
                title: 'Sheet',
                description: 'A bottom sheet inside the page.',
              })
            }
          />
        </>
      )}
    />
  )
}
