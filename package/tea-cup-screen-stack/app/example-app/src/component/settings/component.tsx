import { nullEq } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import { ScreenStackMemo } from '@rinn7e/tea-cup-screen-stack/component'
import * as S from 'fp-ts/lib/string'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import {
  type Model,
  type Msg,
  type Page,
  type PageMsg,
  children,
  descriptions,
} from './type'

const rowClassName =
  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100'

const navButtonClassName =
  'rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'

const pageView = (
  page: Page,
  pageDispatch: (msg: PageMsg) => void,
  depth: number,
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
          onClick={() => pageDispatch({ _tag: 'Back' })}
        >
          ‹ Back
        </button>
      )}
      {depth > 1 && (
        <button
          type='button'
          data-test='settings-top'
          className={navButtonClassName}
          onClick={() => pageDispatch({ _tag: 'Top' })}
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
        onClick={() => pageDispatch({ _tag: 'Go', page: child })}
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

// The screen is just the page's name; pages send `PageMsg`s, which the
// settings component turns into stack moves
export const Settings = ({
  model,
  dispatch,
}: {
  model: Model
  dispatch: Dispatcher<Msg>
}) => {
  const stackDispatch = map(
    dispatch,
    (subMsg: ScreenStack.Msg<Page, PageMsg>): Msg => ({
      _tag: 'ScreenStackMsg',
      subMsg,
    }),
  )
  return (
    <ScreenStackMemo
      model={model.pages}
      dispatch={stackDispatch}
      itemEq={S.Eq}
      parent={null}
      parentEq={nullEq}
      renderScreen={(page, pageDispatch, depth) =>
        pageView(page, pageDispatch, depth)
      }
    />
  )
}
