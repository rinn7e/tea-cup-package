import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerMemo } from '@rinn7e/tea-cup-drawer/component'
import { nullEq } from '@rinn7e/tea-cup-prelude'
import { type Dispatcher, map } from 'tea-cup-fp'

import { drawerBody } from '../../view/drawer-body'
import { type Model, type Msg } from './type'

const columns = ['Name', 'Region', 'Plan', 'Seats', 'Since', 'Owner', 'Status']

const rows = Array.from({ length: 6 }, (_, i) => [
  `Team ${i + 1}`,
  ['Europe', 'Asia', 'Americas'][i % 3] ?? '',
  i % 2 === 0 ? 'Business' : 'Starter',
  `${(i + 1) * 12}`,
  `20${20 + i}`,
  `owner${i + 1}@example.com`,
  i % 3 === 0 ? 'Active' : 'Trial',
])

export const ScrollXDrawer = ({
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
      className='w-[85vw] max-w-md'
      renderContent={(_internal) =>
        drawerBody({
          id,
          config: model.drawer.config,
          dispatch: drawerDispatch,
          title: 'Sideways content',
          description:
            'A swipe on the table or the code scrolls them, at any position; swipe anywhere else to close the drawer.',
          children: (
            <>
              <div
                data-test='scroll-x-area'
                className='overflow-x-auto rounded-lg border border-slate-200'
              >
                <table className='text-left text-sm whitespace-nowrap'>
                  <thead className='bg-slate-50 text-slate-500'>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className='px-4 py-2 font-semibold'>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row[0]} className='border-t border-slate-100'>
                        {row.map((cell, i) => (
                          <td key={i} className='px-4 py-2'>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <pre
                data-test='scroll-x-code'
                className='overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300'
              >
                {
                  "update({ _tag: 'Open', internal: null }, model) // a long line that doesn't fit, so the block scrolls sideways"
                }
              </pre>
            </>
          ),
        })
      }
    />
  )
}
