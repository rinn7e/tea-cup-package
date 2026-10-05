import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { MeasuredContent } from './sub-component/measured-content'
import {
  type MeasuredContentMsg,
  type Model,
  type Msg,
  type Summary,
  SummaryEq,
} from './type'

export const MeasuredSnapDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<Summary, MeasuredContentMsg>): Msg => ({
      _tag: 'DrawerMsg',
      subMsg,
    }),
  )
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={SummaryEq}
      parent={null}
      parentEq={nullEq}
      className='h-full max-h-[97%] border-t border-slate-200'
      renderContent={(summary, contentDispatch) => (
        <MeasuredContent
          summary={summary}
          config={model.drawer.config}
          dispatch={contentDispatch}
          drawerDispatch={drawerDispatch}
        />
      )}
    />
  )
}
