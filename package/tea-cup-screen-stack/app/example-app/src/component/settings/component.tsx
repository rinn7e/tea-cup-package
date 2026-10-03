import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import { ScreenStackMemo } from '@rinn7e/tea-cup-screen-stack/component'
import * as S from 'fp-ts/lib/string'
import { type ReactNode } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { type Page, children, descriptions } from './type'

const rowClassName =
  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

const navButtonClassName =
  'rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'

const pageView = (
  page: Page,
  depth: number,
  dispatch: Dispatcher<ScreenStack.Msg<Page>>,
): ReactNode => (
  // Opaque, so the incoming page covers the outgoing one while sliding
  <div
    data-test={`settings-page-${page}`}
    className='flex flex-col gap-1 bg-white'
  >
    <div className='flex h-9 items-center gap-1'>
      {depth > 0 && (
        <button
          type='button'
          data-test='settings-back'
          className={navButtonClassName}
          onClick={() => dispatch({ _tag: 'Pop' })}
        >
          ‹ Back
        </button>
      )}
      {depth > 1 && (
        <button
          type='button'
          data-test='settings-top'
          className={navButtonClassName}
          onClick={() => dispatch({ _tag: 'PopTo', depth: 0 })}
        >
          Top
        </button>
      )}
      <h3 className='ml-auto font-semibold text-slate-900'>{page}</h3>
    </div>
    {children[page].map((child) => (
      <button
        key={child}
        type='button'
        data-test={`settings-go-${child}`}
        className={rowClassName}
        onClick={() => dispatch({ _tag: 'Push', screen: child })}
      >
        {child}
        <span aria-hidden='true' className='text-lg text-slate-400'>
          ›
        </span>
      </button>
    ))}
    {descriptions[page] !== '' && (
      <p className='px-3 py-2 text-sm text-slate-600'>{descriptions[page]}</p>
    )}
  </div>
)

// The plainest use: the screen is a string and the view dispatches stack
// messages directly, with nothing for the parent to route
export const Settings = ({
  model,
  dispatch,
}: {
  model: ScreenStack.Model<Page>
  dispatch: Dispatcher<ScreenStack.Msg<Page>>
}) => (
  <ScreenStackMemo
    model={model}
    dispatch={dispatch}
    itemEq={S.Eq}
    parent={null}
    parentEq={nullEq}
    renderScreen={(page, depth) => pageView(page, depth, dispatch)}
  />
)
