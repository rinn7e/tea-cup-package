import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle } from '@rinn7e/tea-cup-drawer/component'
import { type ReactNode } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

export const buttonClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700'

export const secondaryButtonClassName =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'

// Content layout shared by the demo drawers: handle, title, description,
// extra content and a Close button. `id` is the drawer's config id, used
// for the `data-test` ids.
export const drawerBody = <Item,>(args: {
  id: string
  dispatch: Dispatcher<Drawer.Msg<Item>>
  title: string
  description: string
  children?: ReactNode
}) => (
  <div
    data-test={`content-${args.id}`}
    className='flex min-h-0 flex-1 flex-col'
  >
    <DrawerHandle dispatch={args.dispatch} />
    <div className='flex min-h-0 flex-1 flex-col gap-3 px-6 pt-2 pb-8'>
      <h2 className='text-lg font-bold text-slate-900'>{args.title}</h2>
      <p className='text-sm text-slate-600'>{args.description}</p>
      {args.children}
      <div className='flex gap-2'>
        <button
          type='button'
          data-test={`close-${args.id}`}
          className={secondaryButtonClassName}
          onClick={() => args.dispatch({ _tag: 'Close' })}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)
