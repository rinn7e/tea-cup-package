import * as Drawer from '@rinn7e/tea-cup-drawer'
import { drawerHandleView } from '@rinn7e/tea-cup-drawer/component'
import * as O from 'fp-ts/lib/Option'
import { type ReactNode } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

export const buttonClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700'

export const secondaryButtonClassName =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'

const titleId = (id: string): string => `drawer-title-${id}`

const descriptionId = (id: string): string => `drawer-description-${id}`

// Config of a drawer using `drawerBody`: named by the body's title and
// described by its description
export const bodyConfig = <Item,>(
  id: string,
  uniqueKeyField: (internal: Item) => string,
): Drawer.Config<Item> =>
  Drawer.defaultConfig(id, uniqueKeyField, {
    label: { _tag: 'ElementId', id: titleId(id) },
    describedBy: O.some(descriptionId(id)),
  })

// Content layout shared by the demo drawers: handle, title, description,
// extra content and a Close button. `id` is the drawer's config id, used
// for the `data-test` ids.
export const drawerBody = <Item,>(args: {
  id: string
  config: Drawer.Config<Item>
  dispatch: Dispatcher<Drawer.Msg<Item>>
  title: string
  description: string
  children?: ReactNode
}) => (
  <div
    data-test={`content-${args.id}`}
    className='flex min-h-0 flex-1 flex-col'
  >
    {drawerHandleView(args.config, args.dispatch)}
    <div className='flex min-h-0 flex-1 flex-col gap-3 px-6 pt-2 pb-8'>
      <h2 id={titleId(args.id)} className='text-lg font-bold text-slate-900'>
        {args.title}
      </h2>
      <p id={descriptionId(args.id)} className='text-sm text-slate-600'>
        {args.description}
      </p>
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
