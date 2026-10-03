import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle, DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { secondaryButtonClassName } from '../../view/drawer-body'
import {
  ModelEq as FeedbackModelEq,
  type Msg as FeedbackMsg,
} from './sub-component/feedback'
import { FeedbackForm } from './sub-component/feedback/component'
import { type Model, type Msg } from './type'

// Option A, side by side: no payload; the form is passed through the
// `parent` channel, so the memo sees every keystroke
export const FeedbackDrawer = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const drawerDispatch = map(
    dispatch,
    (subMsg: Drawer.Msg<null, FeedbackMsg>): Msg => ({
      _tag: 'DrawerMsg',
      subMsg,
    }),
  )
  return (
    <DrawerMemo
      model={model.drawer}
      dispatch={drawerDispatch}
      itemEq={nullEq}
      parent={model.feedback}
      parentEq={FeedbackModelEq}
      renderContent={(_, contentDispatch, feedback) => (
        <div
          data-test='content-feedback'
          className='flex min-h-0 flex-1 flex-col'
        >
          <DrawerHandle dispatch={drawerDispatch} />
          <div className='flex flex-col gap-3 px-6 pt-2 pb-8'>
            <h2 className='text-lg font-bold text-slate-900'>Feedback</h2>
            <FeedbackForm model={feedback} dispatch={contentDispatch} />
            <button
              type='button'
              data-test='close-feedback'
              className={secondaryButtonClassName}
              onClick={() => drawerDispatch({ _tag: 'Close' })}
            >
              Close
            </button>
          </div>
        </div>
      )}
    />
  )
}
